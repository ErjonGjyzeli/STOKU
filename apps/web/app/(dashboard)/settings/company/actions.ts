'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

const companySchema = z.object({
  legal_name: z.string().trim().min(2, 'Ragione sociale obbligatoria').max(200),
  vat_number: z.string().trim().max(40).optional().or(z.literal('')),
  tax_code: z.string().trim().max(40).optional().or(z.literal('')),
  address_line1: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  postal_code: z.string().trim().max(20).optional().or(z.literal('')),
  country: z.string().trim().length(2, 'ISO 2 lettere').optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  email: z.string().trim().email('Email non valida').max(120).optional().or(z.literal('')),
  iban: z.string().trim().max(40).optional().or(z.literal('')),
  bank_name: z.string().trim().max(120).optional().or(z.literal('')),
  logo_url: z.string().trim().url('URL non valido').max(500).optional().or(z.literal('')),
  invoice_footer: z.string().trim().max(1000).optional().or(z.literal('')),
  default_tax_rate: z
    .union([z.string(), z.number()])
    .transform((v) => Number(typeof v === 'number' ? v : String(v).replace(',', '.')))
    .refine((v) => Number.isFinite(v) && v >= 0 && v <= 100, {
      message: 'IVA tra 0 e 100',
    }),
});

export type CompanyInput = z.input<typeof companySchema>;
export type ActionResult = { ok: true } | { ok: false; error: string };

export async function upsertCompanySettings(input: CompanyInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('company_settings')
    .update({
      legal_name: parsed.data.legal_name,
      vat_number: parsed.data.vat_number?.trim() || null,
      tax_code: parsed.data.tax_code?.trim() || null,
      address_line1: parsed.data.address_line1?.trim() || null,
      city: parsed.data.city?.trim() || null,
      postal_code: parsed.data.postal_code?.trim() || null,
      country: parsed.data.country?.trim().toUpperCase() || 'AL',
      phone: parsed.data.phone?.trim() || null,
      email: parsed.data.email?.trim() || null,
      iban: parsed.data.iban?.trim() || null,
      bank_name: parsed.data.bank_name?.trim() || null,
      logo_url: parsed.data.logo_url?.trim() || null,
      invoice_footer: parsed.data.invoice_footer?.trim() || null,
      default_tax_rate: parsed.data.default_tax_rate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings/company');
  return { ok: true };
}
