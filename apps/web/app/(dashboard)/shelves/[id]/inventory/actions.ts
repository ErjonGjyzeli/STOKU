'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

// Spec §3.7 / §3.8 / §7.bis: conta scaffale-per-scaffale, confronto logico
// vs reale, rettifica via inventory_movements.reason='adjustment'.

const countSchema = z.object({
  productId: z.string().uuid(),
  countedQty: z.coerce.number().int().min(0, 'Quantità non valida'),
});

const inputSchema = z.object({
  shelfId: z.string().uuid(),
  counts: z.array(countSchema).min(1, 'Nessuna riga da rettificare'),
});

export type ApplyInventoryInput = z.input<typeof inputSchema>;

export type Discrepancy = {
  productId: string;
  logical: number;
  counted: number;
  delta: number;
};

export type ApplyInventoryData = {
  adjusted: number;
  matched: number;
  skipped: number;
  discrepancies: Discrepancy[];
  errors: Array<{ productId: string; message: string }>;
};

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function applyInventoryCount(
  input: ApplyInventoryInput,
): Promise<ActionResult<ApplyInventoryData>> {
  const session = await requireSession();
  const role = session.profile.role;
  if (role !== 'admin' && role !== 'warehouse') {
    return { ok: false, error: 'Permessi insufficienti' };
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' };
  }

  const supabase = await createClient();

  // Fetch scaffale per controllo permessi (warehouse limitato ai PV abilitati)
  // e per il code da inserire nelle notes del movimento.
  const { data: shelf, error: shelfErr } = await supabase
    .from('shelves')
    .select('id, code, store_id, is_active')
    .eq('id', parsed.data.shelfId)
    .single();
  if (shelfErr || !shelf) {
    return { ok: false, error: shelfErr?.message ?? 'Scaffale non trovato' };
  }
  if (!shelf.is_active) {
    return { ok: false, error: 'Scaffale disattivato' };
  }
  if (role === 'warehouse') {
    const inScope = session.stores.some((s) => s.id === shelf.store_id);
    if (!inScope) {
      return { ok: false, error: 'PV non abilitato per questo utente' };
    }
  }

  const noteText = `rettifica inventario scaffale ${shelf.code}`;
  const data: ApplyInventoryData = {
    adjusted: 0,
    matched: 0,
    skipped: 0,
    discrepancies: [],
    errors: [],
  };

  // Sequenziale per evitare race conditions e per surface-are partial-success.
  // Nota: senza transazione (Supabase JS non supporta multi-statement tx);
  // se UPDATE stock fallisce dopo INSERT movement, il movimento resta come
  // audit. Documentato nei rischi noti.
  for (const row of parsed.data.counts) {
    // Stock attuale (logico) per la combinazione prodotto/PV/scaffale.
    const { data: stock, error: stockErr } = await supabase
      .from('stock')
      .select('quantity, reserved_quantity')
      .eq('product_id', row.productId)
      .eq('store_id', shelf.store_id)
      .eq('shelf_id', shelf.id)
      .maybeSingle();

    if (stockErr) {
      data.errors.push({ productId: row.productId, message: stockErr.message });
      data.skipped += 1;
      continue;
    }
    if (!stock) {
      data.errors.push({ productId: row.productId, message: 'Stock non trovato' });
      data.skipped += 1;
      continue;
    }

    const logical = stock.quantity ?? 0;
    const reserved = stock.reserved_quantity ?? 0;
    const counted = row.countedQty;
    const delta = counted - logical;

    // Vincolo DB: quantity >= reserved_quantity. Bloccare presto con
    // messaggio chiaro invece di lasciar fallire il check constraint.
    if (counted < reserved) {
      data.errors.push({
        productId: row.productId,
        message: `Conteggio (${counted}) < quantità prenotata (${reserved}). Annulla la prenotazione prima.`,
      });
      data.skipped += 1;
      continue;
    }

    if (delta === 0) {
      const { error: touchErr } = await supabase
        .from('stock')
        .update({ last_counted_at: new Date().toISOString() })
        .eq('product_id', row.productId)
        .eq('store_id', shelf.store_id)
        .eq('shelf_id', shelf.id);
      if (touchErr) {
        data.errors.push({ productId: row.productId, message: touchErr.message });
        data.skipped += 1;
        continue;
      }
      data.matched += 1;
      continue;
    }

    // Insert movimento prima dell'UPDATE: se UPDATE fallisce, abbiamo
    // comunque traccia del tentativo nell'audit log.
    const { error: movErr } = await supabase.from('inventory_movements').insert({
      product_id: row.productId,
      change: delta,
      reason: 'adjustment',
      store_id: shelf.store_id,
      staff_id: session.userId,
      notes: noteText,
    });
    if (movErr) {
      data.errors.push({ productId: row.productId, message: movErr.message });
      data.skipped += 1;
      continue;
    }

    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabase
      .from('stock')
      .update({
        quantity: counted,
        last_counted_at: nowIso,
        updated_at: nowIso,
      })
      .eq('product_id', row.productId)
      .eq('store_id', shelf.store_id)
      .eq('shelf_id', shelf.id);
    if (updErr) {
      data.errors.push({ productId: row.productId, message: updErr.message });
      data.skipped += 1;
      continue;
    }

    data.adjusted += 1;
    data.discrepancies.push({
      productId: row.productId,
      logical,
      counted,
      delta,
    });
  }

  revalidatePath('/shelves');
  revalidatePath(`/shelves/${shelf.id}`);
  revalidatePath('/inventory');

  return { ok: true, data };
}
