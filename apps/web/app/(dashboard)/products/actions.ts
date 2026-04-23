'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

const CONDITIONS = ['new', 'used', 'refurbished', 'damaged'] as const;

const priceSchema = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  })
  .refine((v) => v === null || v >= 0, { message: 'Prezzo non negativo' });

const productSchema = z.object({
  sku: z
    .string()
    .trim()
    .max(40, 'SKU massimo 40 caratteri')
    .regex(/^[A-Za-z0-9._\-/]*$/, 'SKU con lettere, numeri e - _ . /')
    .optional()
    .or(z.literal('')),
  name: z.string().trim().min(2, 'Nome minimo 2 caratteri').max(200),
  legacy_nr: z.string().trim().max(40).optional().or(z.literal('')),
  oem_code: z.string().trim().max(80).optional().or(z.literal('')),
  category_id: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => {
      if (v === null || v === undefined || v === '') return null;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    }),
  condition: z.enum(CONDITIONS),
  price_sell: priceSchema,
  price_cost: priceSchema,
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  is_active: z.boolean().default(true),
});

export type ProductInput = z.input<typeof productSchema>;
export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

function normalize(parsed: z.infer<typeof productSchema>) {
  return {
    sku: parsed.sku?.trim() || undefined,
    name: parsed.name,
    legacy_nr: parsed.legacy_nr?.trim() || null,
    oem_code: parsed.oem_code?.trim() || null,
    category_id: parsed.category_id,
    condition: parsed.condition,
    price_sell: parsed.price_sell,
    price_cost: parsed.price_cost,
    description: parsed.description?.trim() || null,
    is_active: parsed.is_active,
  };
}

async function generateSku() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('next_product_sku');
  if (error) throw error;
  if (!data) throw new Error('next_product_sku returned empty value');
  return data as string;
}

export async function createProduct(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  await requireSession();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' };
  }
  const norm = normalize(parsed.data);
  const sku = norm.sku ?? (await generateSku());
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .insert({ ...norm, sku })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/products');
  return { ok: true, data: { id: data.id } };
}

export async function updateProduct(id: string, input: ProductInput): Promise<ActionResult> {
  await requireSession();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' };
  }
  const norm = normalize(parsed.data);
  const supabase = await createClient();
  const { error } = await supabase
    .from('products')
    .update({
      ...norm,
      sku: norm.sku ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/products');
  return { ok: true, data: null };
}

export async function toggleProductActive(id: string, active: boolean): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();
  const { error } = await supabase
    .from('products')
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/products');
  return { ok: true, data: null };
}
