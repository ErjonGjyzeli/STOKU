'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

const CUSTOMER_TYPES = ['private', 'business'] as const;

const customerSchema = z.object({
  code: z
    .string()
    .trim()
    .max(20)
    .regex(/^[A-Za-z0-9._\-/]*$/, 'Code con lettere, numeri e - _ . /')
    .optional()
    .or(z.literal('')),
  type: z.enum(CUSTOMER_TYPES),
  name: z.string().trim().min(2, 'Nome minimo 2 caratteri').max(200),
  vat_number: z.string().trim().max(40).optional().or(z.literal('')),
  tax_code: z.string().trim().max(40).optional().or(z.literal('')),
  email: z.string().trim().email('Email non valida').max(120).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  address_line1: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  postal_code: z.string().trim().max(20).optional().or(z.literal('')),
  country: z.string().trim().length(2, 'Codice ISO 2 lettere').optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

export type CustomerInput = z.input<typeof customerSchema>;
export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

function normalize(parsed: z.infer<typeof customerSchema>) {
  return {
    code: parsed.code?.trim() || undefined,
    type: parsed.type,
    name: parsed.name,
    vat_number: parsed.vat_number?.trim() || null,
    tax_code: parsed.tax_code?.trim() || null,
    email: parsed.email?.trim() || null,
    phone: parsed.phone?.trim() || null,
    address_line1: parsed.address_line1?.trim() || null,
    city: parsed.city?.trim() || null,
    postal_code: parsed.postal_code?.trim() || null,
    country: parsed.country?.trim().toUpperCase() || 'AL',
    notes: parsed.notes?.trim() || null,
  };
}

async function generateCode() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('next_customer_code');
  if (error) throw error;
  if (!data) throw new Error('next_customer_code returned empty value');
  return data as string;
}

export async function createCustomer(input: CustomerInput): Promise<ActionResult<{ id: string }>> {
  await requireSession();
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' };
  }
  const norm = normalize(parsed.data);
  const code = norm.code ?? (await generateCode());
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customers')
    .insert({ ...norm, code })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/customers');
  return { ok: true, data: { id: data.id } };
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<ActionResult> {
  await requireSession();
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' };
  }
  const norm = normalize(parsed.data);
  const supabase = await createClient();
  const { error } = await supabase
    .from('customers')
    .update({ ...norm, code: norm.code ?? undefined, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/customers');
  revalidatePath(`/customers/${id}`);
  return { ok: true, data: null };
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/customers');
  return { ok: true, data: null };
}
