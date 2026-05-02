'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { ALLOWED_TRANSITIONS } from './status';

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

const draftSchema = z
  .object({
    from_store_id: z.coerce.number().int().positive('Zgjidh origjinën'),
    to_store_id: z.coerce.number().int().positive('Zgjidh destinacionin'),
    notes: z.string().trim().max(2000).optional().or(z.literal('')),
  })
  .refine((v) => v.from_store_id !== v.to_store_id, {
    message: 'Origjina dhe destinacioni duhet të jenë të ndryshëm',
  });

const itemSchema = z.object({
  transfer_id: z.string().uuid(),
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().positive('Sasia > 0'),
});

const transitionSchema = z.object({
  transfer_id: z.string().uuid(),
  new_status: z.enum(['in_transit', 'completed', 'cancelled']),
});

const quantityReceivedSchema = z.object({
  item_id: z.string().uuid(),
  quantity_received: z.coerce.number().int().min(0),
});

async function generateTransferNumber() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('next_transfer_number');
  if (error) throw error;
  if (!data) throw new Error('next_transfer_number returned empty');
  return data as string;
}

export async function createDraftTransfer(
  input: z.input<typeof draftSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Të dhëna të pavlefshme' };
  }
  const transferNumber = await generateTransferNumber();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('stock_transfers')
    .insert({
      transfer_number: transferNumber,
      from_store_id: parsed.data.from_store_id,
      to_store_id: parsed.data.to_store_id,
      status: 'draft',
      initiated_by: session.userId,
      notes: parsed.data.notes?.trim() || null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/transfers');
  return { ok: true, data: { id: data.id } };
}

export async function addTransferItem(
  input: z.input<typeof itemSchema>,
): Promise<ActionResult> {
  await requireSession();
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Të dhëna të pavlefshme' };
  }

  const supabase = await createClient();

  // Verifica che il trasferimento sia ancora in bozza.
  const { data: transfer, error: tErr } = await supabase
    .from('stock_transfers')
    .select('status, from_store_id')
    .eq('id', parsed.data.transfer_id)
    .single();
  if (tErr || !transfer) {
    return { ok: false, error: tErr?.message ?? 'Transferimi nuk u gjet' };
  }
  if (transfer.status !== 'draft') {
    return { ok: false, error: `Transferim ${transfer.status}: shto vetëm në draft` };
  }

  // Verifica disponibilità allo store di origine (il trigger F1 decrementa
  // solo alla spedizione, ma blocchiamo in anticipo per feedback utente).
  const { data: stock } = await supabase
    .from('stock')
    .select('quantity, reserved_quantity')
    .eq('product_id', parsed.data.product_id)
    .eq('store_id', transfer.from_store_id)
    .maybeSingle();
  const available = stock ? stock.quantity - stock.reserved_quantity : 0;
  if (parsed.data.quantity > available) {
    return {
      ok: false,
      error: `Sasia e kërkuar ${parsed.data.quantity} > e disponueshme ${available} në origjinë`,
    };
  }

  const { error } = await supabase.from('stock_transfer_items').insert({
    transfer_id: parsed.data.transfer_id,
    product_id: parsed.data.product_id,
    quantity: parsed.data.quantity,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/transfers/${parsed.data.transfer_id}`);
  return { ok: true, data: null };
}

export async function removeTransferItem(
  transferId: string,
  itemId: string,
): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();
  // Solo in bozza: post-shipment è responsabilità del ricevente correggere
  // via quantity_received.
  const { data: t } = await supabase
    .from('stock_transfers')
    .select('status')
    .eq('id', transferId)
    .single();
  if (!t) return { ok: false, error: 'Transferimi nuk u gjet' };
  if (t.status !== 'draft') {
    return { ok: false, error: `Transferim ${t.status}: hiq vetëm në draft` };
  }
  const { error } = await supabase.from('stock_transfer_items').delete().eq('id', itemId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/transfers/${transferId}`);
  return { ok: true, data: null };
}

export async function transitionTransferStatus(
  input: z.input<typeof transitionSchema>,
): Promise<ActionResult> {
  await requireSession();
  const parsed = transitionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Të dhëna të pavlefshme' };
  }
  const supabase = await createClient();
  const { data: t, error: readErr } = await supabase
    .from('stock_transfers')
    .select('status')
    .eq('id', parsed.data.transfer_id)
    .single();
  if (readErr || !t) {
    return { ok: false, error: readErr?.message ?? 'Transferimi nuk u gjet' };
  }
  const allowed = ALLOWED_TRANSITIONS[t.status] ?? [];
  if (!allowed.includes(parsed.data.new_status)) {
    return {
      ok: false,
      error: `Tranzicion ${t.status} → ${parsed.data.new_status} nuk lejohet`,
    };
  }

  // completed: richiede received_by loggato nella session (lo prendiamo
  // dal requireSession; scriverlo direttamente nell'UPDATE).
  const session = await requireSession();
  const patch: { status: string; received_by?: string } = { status: parsed.data.new_status };
  if (parsed.data.new_status === 'completed') {
    patch.received_by = session.userId;
  }

  const { error } = await supabase
    .from('stock_transfers')
    .update(patch)
    .eq('id', parsed.data.transfer_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/transfers');
  revalidatePath(`/transfers/${parsed.data.transfer_id}`);
  return { ok: true, data: null };
}

export async function setItemQuantityReceived(
  input: z.input<typeof quantityReceivedSchema>,
): Promise<ActionResult> {
  await requireSession();
  const parsed = quantityReceivedSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Të dhëna të pavlefshme' };
  }
  const supabase = await createClient();

  // Può essere settato solo in stato in_transit (prima della chiusura).
  const { data: item } = await supabase
    .from('stock_transfer_items')
    .select('transfer_id, quantity, transfer:stock_transfers(status)')
    .eq('id', parsed.data.item_id)
    .single();
  if (!item) return { ok: false, error: 'Rreshti nuk u gjet' };
  const transfer = item.transfer as unknown as { status: string } | null;
  if (!transfer || transfer.status !== 'in_transit') {
    return {
      ok: false,
      error: 'Sasia e marrë editohet vetëm kur transferimi është në tranzit',
    };
  }
  if (parsed.data.quantity_received > item.quantity) {
    return { ok: false, error: `Marrë > dërguar (${item.quantity})` };
  }

  const { error } = await supabase
    .from('stock_transfer_items')
    .update({ quantity_received: parsed.data.quantity_received })
    .eq('id', parsed.data.item_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/transfers/${item.transfer_id}`);
  return { ok: true, data: null };
}
