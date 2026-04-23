'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

const currentYear = new Date().getFullYear();

const vehicleSchema = z.object({
  make_id: z.coerce.number().int().positive('Seleziona una marca'),
  model: z.string().trim().min(1, 'Modello obbligatorio').max(80),
  chassis_code: z.string().trim().max(20).optional().or(z.literal('')),
  year_from: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1960 && v <= currentYear + 2), {
      message: `Anno tra 1960 e ${currentYear + 2}`,
    }),
  year_to: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1960 && v <= currentYear + 5), {
      message: `Anno tra 1960 e ${currentYear + 5}`,
    }),
  engine: z.string().trim().max(60).optional().or(z.literal('')),
});

export type VehicleInput = z.input<typeof vehicleSchema>;
export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

function normalize(parsed: z.infer<typeof vehicleSchema>) {
  return {
    make_id: parsed.make_id,
    model: parsed.model,
    chassis_code: parsed.chassis_code?.trim() || null,
    year_from: parsed.year_from,
    year_to: parsed.year_to,
    engine: parsed.engine?.trim() || null,
  };
}

export async function createMake(name: string): Promise<ActionResult<{ id: number }>> {
  await requireSession();
  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false, error: 'Nome marca troppo corto' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('vehicle_makes')
    .insert({ name: trimmed })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/vehicles');
  return { ok: true, data: { id: data.id } };
}

export async function createVehicle(input: VehicleInput): Promise<ActionResult<{ id: number }>> {
  await requireSession();
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('vehicles')
    .insert(normalize(parsed.data))
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/vehicles');
  return { ok: true, data: { id: data.id } };
}

export async function updateVehicle(id: number, input: VehicleInput): Promise<ActionResult> {
  await requireSession();
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('vehicles').update(normalize(parsed.data)).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/vehicles');
  return { ok: true, data: null };
}

export async function deleteVehicle(id: number): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/vehicles');
  return { ok: true, data: null };
}
