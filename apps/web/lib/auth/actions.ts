'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ACTIVE_STORE_COOKIE, getSession } from './session';

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setActiveStore(storeId: number) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: 'Non autenticato' };
  if (!session.stores.some((s) => s.id === storeId)) {
    return { ok: false as const, error: 'Punto vendita non accessibile' };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_STORE_COOKIE, String(storeId), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: ONE_YEAR,
  });

  revalidatePath('/', 'layout');
  return { ok: true as const };
}
