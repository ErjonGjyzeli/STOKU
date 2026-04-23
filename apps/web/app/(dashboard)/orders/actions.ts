'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

const draftSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  store_id: z.coerce.number().int().positive('Seleziona un punto vendita'),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

const itemSchema = z.object({
  order_id: z.string().uuid(),
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().positive('Quantità > 0'),
  unit_price: z
    .union([z.string(), z.number()])
    .transform((v) => {
      const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
      return Number.isFinite(n) && n >= 0 ? n : NaN;
    })
    .refine((v) => Number.isFinite(v), { message: 'Prezzo non valido' }),
});

async function generateOrderNumber() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('next_order_number');
  if (error) throw error;
  if (!data) throw new Error('next_order_number returned empty');
  return data as string;
}

export async function createDraftOrder(
  input: z.input<typeof draftSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' };
  }
  const orderNumber = await generateOrderNumber();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: parsed.data.customer_id || null,
      store_id: parsed.data.store_id,
      staff_id: session.userId,
      status: 'draft',
      notes: parsed.data.notes?.trim() || null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/orders');
  return { ok: true, data: { id: data.id } };
}

export async function addOrderItem(
  input: z.input<typeof itemSchema>,
): Promise<ActionResult> {
  await requireSession();
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' };
  }

  const supabase = await createClient();
  // Snapshot name + sku dal prodotto al momento dell'inserimento nell'ordine.
  const { data: product, error: pErr } = await supabase
    .from('products')
    .select('name, sku, price_sell, currency, is_active')
    .eq('id', parsed.data.product_id)
    .single();
  if (pErr || !product) {
    return { ok: false, error: pErr?.message ?? 'Prodotto non trovato' };
  }
  if (!product.is_active) {
    return { ok: false, error: 'Prodotto disattivato — non vendibile' };
  }

  const { error } = await supabase.from('order_items').insert({
    order_id: parsed.data.order_id,
    product_id: parsed.data.product_id,
    product_name_snapshot: product.name,
    product_sku_snapshot: product.sku,
    quantity: parsed.data.quantity,
    unit_price: parsed.data.unit_price,
  });
  // Il trigger reserve_stock in DB può sollevare exception se stock
  // insufficiente: il messaggio torna attraverso error.message.
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/orders/${parsed.data.order_id}`);
  return { ok: true, data: null };
}

export async function removeOrderItem(
  orderId: string,
  itemId: string,
): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();
  // RPC release_order_item gestisce atomicamente: release reserved_quantity
  // + inventory_movements reason=unreservation + delete della riga.
  // Solleva exception se ordine non è draft o item non trovato.
  const { error } = await supabase.rpc('release_order_item', { p_item_id: itemId });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/orders/${orderId}`);
  return { ok: true, data: null };
}

import { ALLOWED_TRANSITIONS } from './status';

const transitionSchema = z.object({
  order_id: z.string().uuid(),
  new_status: z.enum(['confirmed', 'paid', 'shipped', 'completed', 'cancelled']),
  payment_method: z.enum(['cash', 'bank', 'card', 'other']).nullable().optional(),
});

export async function transitionOrderStatus(
  input: z.input<typeof transitionSchema>,
): Promise<ActionResult> {
  await requireSession();
  const parsed = transitionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' };
  }
  const supabase = await createClient();
  const { data: order, error: readErr } = await supabase
    .from('orders')
    .select('status')
    .eq('id', parsed.data.order_id)
    .single();
  if (readErr || !order) {
    return { ok: false, error: readErr?.message ?? 'Ordine non trovato' };
  }
  const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(parsed.data.new_status)) {
    return {
      ok: false,
      error: `Transizione ${order.status} → ${parsed.data.new_status} non consentita`,
    };
  }

  const patch: { status: string; payment_method?: string | null } = {
    status: parsed.data.new_status,
  };
  if (parsed.data.new_status === 'paid' && parsed.data.payment_method) {
    patch.payment_method = parsed.data.payment_method;
  }

  const { error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', parsed.data.order_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/orders');
  revalidatePath(`/orders/${parsed.data.order_id}`);
  return { ok: true, data: null };
}

export async function deleteDraftOrder(orderId: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();
  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single();
  if (!order) return { ok: false, error: 'Ordine non trovato' };
  if (order.status !== 'draft') {
    return { ok: false, error: `Ordine in stato ${order.status}: non cancellabile` };
  }
  const { error } = await supabase.from('orders').delete().eq('id', orderId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/orders');
  return { ok: true, data: null };
}
