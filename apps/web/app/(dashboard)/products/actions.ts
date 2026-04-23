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
  category_id: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((v) => {
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

const IMAGE_BUCKET = 'product-images';
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function extFromMime(mime: string) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'bin';
}

export async function uploadProductImage(
  formData: FormData,
): Promise<ActionResult<{ id: string; storage_path: string }>> {
  await requireSession();
  const productId = String(formData.get('product_id') ?? '');
  const file = formData.get('file');
  if (!productId) return { ok: false, error: 'product_id mancante' };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'File mancante' };
  }
  if (!IMAGE_MIME.has(file.type)) {
    return { ok: false, error: 'Formato non supportato (JPEG / PNG / WebP)' };
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return { ok: false, error: 'File oltre 5 MB' };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('product_images')
    .select('id, is_primary, sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const shouldBePrimary = !existing || existing.length === 0;
  const nextSort = existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0;

  const ext = extFromMime(file.type);
  const storagePath = `${productId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (upErr) return { ok: false, error: upErr.message };

  const { data: inserted, error: insErr } = await supabase
    .from('product_images')
    .insert({
      product_id: productId,
      storage_path: storagePath,
      is_primary: shouldBePrimary,
      sort_order: nextSort,
    })
    .select('id')
    .single();

  if (insErr) {
    await supabase.storage.from(IMAGE_BUCKET).remove([storagePath]);
    return { ok: false, error: insErr.message };
  }

  revalidatePath('/products');
  return { ok: true, data: { id: inserted.id, storage_path: storagePath } };
}

export async function deleteProductImage(imageId: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { data: img, error: readErr } = await supabase
    .from('product_images')
    .select('id, product_id, storage_path, is_primary')
    .eq('id', imageId)
    .single();
  if (readErr || !img) {
    return { ok: false, error: readErr?.message ?? 'Immagine non trovata' };
  }

  const { error: storageErr } = await supabase.storage
    .from(IMAGE_BUCKET)
    .remove([img.storage_path]);
  if (storageErr) return { ok: false, error: storageErr.message };

  const { error: delErr } = await supabase.from('product_images').delete().eq('id', imageId);
  if (delErr) return { ok: false, error: delErr.message };

  if (img.is_primary && img.product_id) {
    const { data: replacement } = await supabase
      .from('product_images')
      .select('id')
      .eq('product_id', img.product_id)
      .order('sort_order')
      .limit(1);
    const replacementId = replacement?.[0]?.id;
    if (replacementId) {
      await supabase.from('product_images').update({ is_primary: true }).eq('id', replacementId);
    }
  }

  revalidatePath('/products');
  return { ok: true, data: null };
}

export async function setPrimaryImage(productId: string, imageId: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { error: clearErr } = await supabase
    .from('product_images')
    .update({ is_primary: false })
    .eq('product_id', productId);
  if (clearErr) return { ok: false, error: clearErr.message };

  const { error: setErr } = await supabase
    .from('product_images')
    .update({ is_primary: true })
    .eq('id', imageId)
    .eq('product_id', productId);
  if (setErr) return { ok: false, error: setErr.message };

  revalidatePath('/products');
  return { ok: true, data: null };
}
