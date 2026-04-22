'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

const storeSchema = z.object({
  code: z
    .string()
    .min(2, 'Codice minimo 2 caratteri')
    .max(10, 'Codice massimo 10 caratteri')
    .regex(/^[A-Z0-9]+$/, 'Solo maiuscole e numeri'),
  name: z.string().min(2, 'Nome minimo 2 caratteri'),
  type: z.enum(['shop', 'warehouse', 'mixed']),
  city: z.string().optional().nullable(),
  country: z.string().min(2).max(2).optional().nullable(),
  address_line1: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Email non valida').optional().nullable().or(z.literal('')),
});

export type StoreInput = z.infer<typeof storeSchema>;

export type ActionResult = { ok: true } | { ok: false; error: string };

function normalize(input: StoreInput): StoreInput {
  return {
    ...input,
    email: input.email === '' ? null : input.email,
    city: input.city || null,
    country: input.country || null,
    address_line1: input.address_line1 || null,
    postal_code: input.postal_code || null,
    phone: input.phone || null,
  };
}

export async function createStore(input: StoreInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = storeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('stores').insert(normalize(parsed.data));
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings/stores');
  return { ok: true };
}

export async function updateStore(id: number, input: StoreInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = storeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('stores').update(normalize(parsed.data)).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings/stores');
  return { ok: true };
}

export async function toggleStoreActive(id: number, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('stores').update({ is_active: active }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings/stores');
  return { ok: true };
}
