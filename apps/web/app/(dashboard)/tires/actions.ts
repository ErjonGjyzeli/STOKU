'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

const CONDITIONS = ['new', 'used', 'refurbished', 'damaged'] as const;
const SPEED_INDEXES = ['Q', 'R', 'S', 'T', 'H', 'V', 'W', 'Y', 'ZR'] as const;

const numSchema = (min: number, max: number, label: string) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => {
      if (v === null || v === undefined || v === '') return null;
      const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    })
    .refine((v) => v === null || (v >= min && v <= max), {
      message: `${label} fuori range (${min}–${max})`,
    });

const intSchema = (min: number, max: number, label: string) =>
  numSchema(min, max, label).refine((v) => v === null || Number.isInteger(v), {
    message: `${label} deve essere intero`,
  });

const priceSchema = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  })
  .refine((v) => v === null || v >= 0, { message: 'Prezzo non negativo' });

const tireSchema = z.object({
  sku: z
    .string()
    .trim()
    .max(40)
    .regex(/^[A-Za-z0-9._\-/]*$/, 'SKU con lettere, numeri e - _ . /')
    .optional()
    .or(z.literal('')),
  name: z.string().trim().min(2, 'Nome minimo 2 caratteri').max(200),
  category_id: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => {
      if (v === null || v === undefined || v === '') return null;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    })
    .refine((v) => v !== null, { message: 'Stagione obbligatoria' }),
  condition: z.enum(CONDITIONS),
  vehicle_make: z.string().trim().min(1, 'Marca obbligatoria').max(80),
  vehicle_model: z.string().trim().max(120).optional().or(z.literal('')),
  price_sell: priceSchema,
  price_cost: priceSchema,
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  tire_width: intSchema(100, 400, 'Larghezza'),
  tire_aspect: intSchema(20, 90, 'Spalla'),
  tire_diameter: numSchema(8, 24, 'Diametro'),
  tire_load_index: intSchema(50, 130, 'Indice carico').optional(),
  tire_speed_index: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v === null || v === undefined || v === '' ? null : v))
    .refine(
      (v) => v === null || (SPEED_INDEXES as readonly string[]).includes(v),
      { message: 'Indice velocità non valido' },
    ),
  tire_tread_mm: numSchema(0, 20, 'Battistrada'),
  tire_dot: z.string().trim().max(20).optional().or(z.literal('')),
  tire_runflat: z.boolean().default(false),
  tire_reinforced: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export type TireInput = z.input<typeof tireSchema>;
export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

async function generateSku() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('next_product_sku');
  if (error) throw error;
  if (!data) throw new Error('next_product_sku returned empty value');
  return data as string;
}

export async function createTire(input: TireInput): Promise<ActionResult<{ id: string }>> {
  await requireSession();
  const parsed = tireSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' };
  }
  const v = parsed.data;
  const sku = v.sku?.trim() || (await generateSku());
  const supabase = await createClient();

  // Anti-misuse: verifica che la categoria scelta sia di kind=gomma. Senza
  // questo check, il form potrebbe creare prodotti non-gomma sotto /tires.
  const { data: cat, error: catErr } = await supabase
    .from('product_categories')
    .select('id, kind')
    .eq('id', v.category_id!)
    .single();
  if (catErr || !cat) return { ok: false, error: 'Categoria non trovata' };
  if (cat.kind !== 'gomma') {
    return { ok: false, error: 'Categoria selezionata non è di tipo gomma' };
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      sku,
      name: v.name,
      category_id: v.category_id,
      condition: v.condition,
      vehicle_make: v.vehicle_make,
      vehicle_model: v.vehicle_model?.trim() || null,
      price_sell: v.price_sell,
      price_cost: v.price_cost,
      description: v.description?.trim() || null,
      tire_width: v.tire_width,
      tire_aspect: v.tire_aspect,
      tire_diameter: v.tire_diameter,
      tire_load_index: v.tire_load_index ?? null,
      tire_speed_index: v.tire_speed_index,
      tire_tread_mm: v.tire_tread_mm,
      tire_dot: v.tire_dot?.trim() || null,
      tire_runflat: v.tire_runflat,
      tire_reinforced: v.tire_reinforced,
      is_active: v.is_active,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath('/tires');
  revalidatePath('/products');
  return { ok: true, data: { id: data.id } };
}
