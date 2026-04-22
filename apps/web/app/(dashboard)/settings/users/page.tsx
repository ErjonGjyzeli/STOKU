import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { UsersClient, type StaffRow, type StoreLite } from './users-client';

export const metadata = { title: 'Utenti staff — STOKU' };

export default async function UsersSettingsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: staff, error: staffErr }, { data: stores, error: storesErr }, { data: access }] =
    await Promise.all([
      supabase
        .from('staff_profiles')
        .select('id, email, full_name, role, is_active, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('stores').select('id, code, name').eq('is_active', true).order('code'),
      supabase.from('staff_store_access').select('staff_id, store_id, is_default'),
    ]);

  if (staffErr || storesErr) {
    return (
      <p className="text-destructive text-sm">Errore: {staffErr?.message || storesErr?.message}</p>
    );
  }

  const storeAccessByStaff = new Map<string, number[]>();
  for (const row of access ?? []) {
    const list = storeAccessByStaff.get(row.staff_id) ?? [];
    list.push(row.store_id);
    storeAccessByStaff.set(row.staff_id, list);
  }

  const rows: StaffRow[] = (staff ?? []).map((s) => ({
    id: s.id,
    email: s.email,
    full_name: s.full_name,
    role: s.role as StaffRow['role'],
    is_active: !!s.is_active,
    created_at: s.created_at,
    store_ids: storeAccessByStaff.get(s.id) ?? [],
  }));

  const allStores: StoreLite[] = (stores ?? []).map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
  }));

  return <UsersClient staff={rows} stores={allStores} />;
}
