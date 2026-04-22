import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export type StaffProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'admin' | 'sales' | 'warehouse' | 'viewer';
  is_active: boolean;
};

export type StoreLite = {
  id: number;
  code: string;
  name: string;
  is_default: boolean;
};

export type Session = {
  userId: string;
  email: string;
  profile: StaffProfile;
  stores: StoreLite[];
  activeStoreId: number | null;
};

export const ACTIVE_STORE_COOKIE = 'stoku.active_store';

function parseActiveStoreCookie(raw: string | undefined, stores: StoreLite[]) {
  if (!raw) return null;
  const id = Number(raw);
  if (!Number.isFinite(id)) return null;
  return stores.some((s) => s.id === id) ? id : null;
}

function pickDefaultStoreId(stores: StoreLite[]) {
  if (stores.length === 0) return null;
  return (stores.find((s) => s.is_default) ?? stores[0]).id;
}

export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) return null;

  const stores: StoreLite[] = [];
  if (profile.role === 'admin') {
    const { data } = await supabase
      .from('stores')
      .select('id, code, name')
      .eq('is_active', true)
      .order('code');
    for (const s of data ?? []) {
      stores.push({ id: s.id, code: s.code, name: s.name, is_default: false });
    }
  } else {
    const { data } = await supabase
      .from('staff_store_access')
      .select('is_default, store:stores!inner(id, code, name, is_active)')
      .eq('staff_id', user.id);
    for (const row of data ?? []) {
      const s = row.store as unknown as {
        id: number;
        code: string;
        name: string;
        is_active: boolean;
      };
      if (s?.is_active) {
        stores.push({ id: s.id, code: s.code, name: s.name, is_default: !!row.is_default });
      }
    }
  }

  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(ACTIVE_STORE_COOKIE)?.value;
  const activeStoreId = parseActiveStoreCookie(rawCookie, stores) ?? pickDefaultStoreId(stores);

  return {
    userId: user.id,
    email: user.email ?? '',
    profile: profile as StaffProfile,
    stores,
    activeStoreId,
  };
});

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.profile.role !== 'admin') redirect('/');
  return session;
}
