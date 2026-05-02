'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

// Codice gerarchico §7.bis: blocchi A-Z0-9 separati da `-` (es. TIR-A-12-3, DUR-MAIN).
const CODE_REGEX = /^[A-Z0-9]+(-[A-Z0-9]+)*$/i;

const shelfSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Kodi minimum 2 karaktere')
    .max(40, 'Kodi maksimum 40 karaktere')
    .regex(CODE_REGEX, 'Vetëm shkronja/shifra, blloqe të ndara me "-"'),
  store_id: z.coerce.number().int().positive('Pika e shitjes kërkohet'),
  description: z.string().trim().max(200, 'Maksimum 200 karaktere').optional().or(z.literal('')),
  kind: z.enum(['open', 'cabinet', 'drawer', 'floor']),
  capacity: z
    .union([z.coerce.number().int().positive('Capacità > 0'), z.literal(''), z.null()])
    .optional(),
  is_active: z.boolean().default(true),
});

export type ShelfInput = z.input<typeof shelfSchema>;
export type ShelfParsed = z.output<typeof shelfSchema>;

export type ActionResult = { ok: true } | { ok: false; error: string };

type ShelfWritePayload = {
  code: string;
  store_id: number;
  description: string | null;
  kind: 'open' | 'cabinet' | 'drawer' | 'floor';
  capacity: number | null;
  is_active: boolean;
};

function normalize(input: ShelfParsed): ShelfWritePayload {
  return {
    code: input.code.toUpperCase(),
    store_id: input.store_id,
    description: input.description ? input.description : null,
    kind: input.kind,
    capacity:
      input.capacity === '' || input.capacity === null || input.capacity === undefined
        ? null
        : Number(input.capacity),
    is_active: input.is_active,
  };
}

// Permessi: admin globale, warehouse limitato ai PV abilitati.
// La policy RLS `shelves_write` rifiuta a DB livello, qui filtriamo
// presto per messaggio chiaro all'utente.
async function ensureWriter(storeId: number) {
  const session = await requireSession();
  const role = session.profile.role;
  if (role !== 'admin' && role !== 'warehouse') {
    return { ok: false as const, error: 'Leje të pamjaftueshme' };
  }
  if (role === 'warehouse') {
    const inScope = session.stores.some((s) => s.id === storeId);
    if (!inScope) return { ok: false as const, error: 'PV nuk është i aktivizuar për këtë përdorues' };
  }
  return { ok: true as const };
}

export async function createShelf(input: ShelfInput): Promise<ActionResult> {
  const parsed = shelfSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Të dhëna të pavlefshme' };
  }
  const guard = await ensureWriter(parsed.data.store_id);
  if (!guard.ok) return guard;
  const supabase = await createClient();
  const { error } = await supabase.from('shelves').insert(normalize(parsed.data));
  if (error) return { ok: false, error: error.message };
  revalidatePath('/shelves');
  return { ok: true };
}

export async function updateShelf(id: string, input: ShelfInput): Promise<ActionResult> {
  const parsed = shelfSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Të dhëna të pavlefshme' };
  }
  const guard = await ensureWriter(parsed.data.store_id);
  if (!guard.ok) return guard;
  const supabase = await createClient();
  const { error } = await supabase.from('shelves').update(normalize(parsed.data)).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/shelves');
  revalidatePath(`/shelves/${id}`);
  return { ok: true };
}

export async function toggleShelfActive(id: string, active: boolean): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();
  // RLS filtra. Recupera prima per verificare scope warehouse.
  const { data: shelf, error: readErr } = await supabase
    .from('shelves')
    .select('store_id')
    .eq('id', id)
    .single();
  if (readErr || !shelf) return { ok: false, error: readErr?.message ?? 'Rafti nuk u gjet' };
  const guard = await ensureWriter(shelf.store_id);
  if (!guard.ok) return guard;
  const { error } = await supabase.from('shelves').update({ is_active: active }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/shelves');
  revalidatePath(`/shelves/${id}`);
  return { ok: true };
}
