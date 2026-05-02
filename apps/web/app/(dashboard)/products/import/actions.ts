'use server';

import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';

import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

const CONDITIONS = new Set(['new', 'used', 'refurbished', 'damaged']);
const BATCH_SIZE = 500;
const MAX_ROWS = 10_000;

type RawRow = Record<string, unknown>;

export type ImportResult =
  | {
      ok: true;
      inserted: number;
      skipped: number;
      totalRows: number;
      unknownCategories: string[];
      errors: Array<{ row: number; message: string }>;
    }
  | { ok: false; error: string };

function normalizeHeader(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[àáâä]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[^a-z0-9_]/g, '');
}

const HEADER_MAP: Record<string, string> = {
  name: 'name',
  nome: 'name',
  articolo: 'name',
  descrizione_breve: 'name',
  sku: 'sku',
  codice: 'sku',
  legacy_nr: 'legacy_nr',
  num: 'legacy_nr',
  nr: 'legacy_nr',
  numero: 'legacy_nr',
  id: 'legacy_nr',
  n: 'legacy_nr',
  oem: 'oem_code',
  codice_oem: 'oem_code',
  oem_code: 'oem_code',
  prezzo: 'price_sell',
  prezzo_vendita: 'price_sell',
  price: 'price_sell',
  price_sell: 'price_sell',
  costo: 'price_cost',
  prezzo_costo: 'price_cost',
  price_cost: 'price_cost',
  categoria: 'category',
  category: 'category',
  condizione: 'condition',
  condition: 'condition',
  stato: 'condition',
  descrizione: 'description',
  description: 'description',
  note: 'description',
  notes: 'description',
};

function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function mapCondition(raw: string): string | null {
  const v = raw.toLowerCase().trim();
  if (!v) return null;
  if (CONDITIONS.has(v)) return v;
  if (['nuovo', 'nuova', 'new'].includes(v)) return 'new';
  if (['usato', 'usata', 'used'].includes(v)) return 'used';
  if (['rigenerato', 'rigenerata', 'refurbished'].includes(v)) return 'refurbished';
  if (['danneggiato', 'danneggiata', 'damaged'].includes(v)) return 'damaged';
  return null;
}

export async function importProducts(formData: FormData): Promise<ImportResult> {
  await requireSession();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Skedari mungon' };
  }

  const buffer = await file.arrayBuffer();
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array' });
  } catch (err) {
    return { ok: false, error: `Skedari nuk lexohet: ${(err as Error).message}` };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { ok: false, error: 'Asnjë fletë në skedar' };
  const sheet = workbook.Sheets[sheetName];
  const raw: RawRow[] = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });

  if (raw.length === 0) return { ok: false, error: 'Fleta bosh' };
  if (raw.length > MAX_ROWS) {
    return { ok: false, error: `Tejkaluar kufirin prej ${MAX_ROWS} rreshtave për import` };
  }

  // Build header → field index per il primo record
  const firstKeys = Object.keys(raw[0]);
  const headerToField: Record<string, string> = {};
  for (const key of firstKeys) {
    const norm = normalizeHeader(key);
    const mapped = HEADER_MAP[norm];
    if (mapped) headerToField[key] = mapped;
  }
  if (!Object.values(headerToField).includes('name')) {
    return {
      ok: false,
      error: `Kolona "nome/name" nuk u gjet. Kolonat e njohura: ${Object.keys(HEADER_MAP).join(', ')}`,
    };
  }

  const supabase = await createClient();

  // Categorie → map lowercase → id
  const { data: cats } = await supabase.from('product_categories').select('id, name');
  const categoryByName = new Map<string, number>();
  for (const c of cats ?? []) categoryByName.set(c.name.toLowerCase().trim(), c.id);

  const errors: Array<{ row: number; message: string }> = [];
  const unknownCategories = new Set<string>();
  const toInsert: Array<{
    sku?: string;
    name: string;
    legacy_nr: string | null;
    oem_code: string | null;
    category_id: number | null;
    condition: string;
    price_sell: number | null;
    price_cost: number | null;
    description: string | null;
    is_active: boolean;
  }> = [];

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    const mapped: Partial<Record<string, unknown>> = {};
    for (const [originalKey, field] of Object.entries(headerToField)) {
      mapped[field] = row[originalKey];
    }

    const name = toStr(mapped.name);
    if (!name) {
      errors.push({ row: i + 2, message: 'Nome vuoto' });
      continue;
    }

    const categoryRaw = toStr(mapped.category);
    let categoryId: number | null = null;
    if (categoryRaw) {
      const found = categoryByName.get(categoryRaw.toLowerCase().trim());
      if (found) categoryId = found;
      else unknownCategories.add(categoryRaw);
    }

    const condRaw = toStr(mapped.condition);
    const condition = mapCondition(condRaw) ?? 'used';

    toInsert.push({
      sku: toStr(mapped.sku) || undefined,
      name: name.slice(0, 200),
      legacy_nr: toStr(mapped.legacy_nr) || null,
      oem_code: toStr(mapped.oem_code) || null,
      category_id: categoryId,
      condition,
      price_sell: toNum(mapped.price_sell),
      price_cost: toNum(mapped.price_cost),
      description: toStr(mapped.description) || null,
      is_active: true,
    });
  }

  // Risolvi SKU mancanti con una singola call RPC per batch
  const missingSkuIdxs: number[] = [];
  for (let i = 0; i < toInsert.length; i++) {
    if (!toInsert[i].sku) missingSkuIdxs.push(i);
  }
  for (const i of missingSkuIdxs) {
    const { data, error } = await supabase.rpc('next_product_sku');
    if (error || !data) {
      errors.push({ row: i + 2, message: `SKU auto fallito: ${error?.message ?? 'vuoto'}` });
      toInsert[i].sku = `SKIP-${i}`;
      continue;
    }
    toInsert[i].sku = data as string;
  }

  // Bulk insert in batch
  let inserted = 0;
  for (let start = 0; start < toInsert.length; start += BATCH_SIZE) {
    const batch = toInsert.slice(start, start + BATCH_SIZE);
    const { error } = await supabase.from('products').insert(
      batch.map((r) => ({
        sku: r.sku!,
        name: r.name,
        legacy_nr: r.legacy_nr,
        oem_code: r.oem_code,
        category_id: r.category_id,
        condition: r.condition,
        price_sell: r.price_sell,
        price_cost: r.price_cost,
        description: r.description,
        is_active: r.is_active,
      })),
    );
    if (error) {
      errors.push({
        row: start + 2,
        message: `Batch ${start / BATCH_SIZE + 1}: ${error.message}`,
      });
      continue;
    }
    inserted += batch.length;
  }

  revalidatePath('/products');

  return {
    ok: true,
    inserted,
    skipped: toInsert.length - inserted,
    totalRows: raw.length,
    unknownCategories: Array.from(unknownCategories),
    errors: errors.slice(0, 50),
  };
}
