'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/session';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const ROLE = z.enum(['admin', 'sales', 'warehouse', 'viewer']);

const createSchema = z.object({
  email: z.string().email('Email non valida'),
  full_name: z.string().min(2, 'Nome minimo 2 caratteri'),
  role: ROLE,
  password: z.string().min(8, 'Password minimo 8 caratteri'),
  store_ids: z.array(z.number()).default([]),
});

const updateSchema = z.object({
  full_name: z.string().min(2),
  role: ROLE,
  is_active: z.boolean(),
  store_ids: z.array(z.number()),
});

export type CreateUserInput = z.infer<typeof createSchema>;
export type UpdateUserInput = z.infer<typeof updateSchema>;

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createStaffUser(input: CreateUserInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' };
  }

  const service = createServiceClient();
  const { data: created, error: authErr } = await service.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });

  if (authErr || !created.user) {
    return { ok: false, error: authErr?.message ?? 'Impossibile creare utente' };
  }

  const { error: profileErr } = await service.from('staff_profiles').insert({
    id: created.user.id,
    email: parsed.data.email,
    full_name: parsed.data.full_name,
    role: parsed.data.role,
    is_active: true,
  });

  if (profileErr) {
    await service.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: profileErr.message };
  }

  if (parsed.data.store_ids.length > 0) {
    const rows = parsed.data.store_ids.map((store_id, i) => ({
      staff_id: created.user!.id,
      store_id,
      is_default: i === 0 || null,
    }));
    const { error: accessErr } = await service.from('staff_store_access').insert(rows);
    if (accessErr) return { ok: false, error: accessErr.message };
  }

  revalidatePath('/settings/users');
  return { ok: true };
}

export async function updateStaffUser(id: string, input: UpdateUserInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('staff_profiles')
    .update({
      full_name: parsed.data.full_name,
      role: parsed.data.role,
      is_active: parsed.data.is_active,
    })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  const service = createServiceClient();
  const { error: delErr } = await service.from('staff_store_access').delete().eq('staff_id', id);
  if (delErr) return { ok: false, error: delErr.message };

  if (parsed.data.store_ids.length > 0) {
    const rows = parsed.data.store_ids.map((store_id, i) => ({
      staff_id: id,
      store_id,
      is_default: i === 0 || null,
    }));
    const { error: insErr } = await service.from('staff_store_access').insert(rows);
    if (insErr) return { ok: false, error: insErr.message };
  }

  revalidatePath('/settings/users');
  return { ok: true };
}

export async function resetStaffPassword(id: string, password: string): Promise<ActionResult> {
  await requireAdmin();
  if (password.length < 8) return { ok: false, error: 'Password minimo 8 caratteri' };
  const service = createServiceClient();
  const { error } = await service.auth.admin.updateUserById(id, { password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
