'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ACTIVE_STORE_ALL, ACTIVE_STORE_COOKIE, getSession } from './session';

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setActiveStore(storeId: number | null) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: 'Non autenticato' };

  const cookieStore = await cookies();

  if (storeId == null) {
    // Scope esplicito "tutti i magazzini": memorizziamo il sentinel
    // "all" per distinguere dallo stato iniziale senza cookie (che invece
    // ricade sul primo store).
    cookieStore.set(ACTIVE_STORE_COOKIE, ACTIVE_STORE_ALL, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: ONE_YEAR,
    });
    revalidatePath('/', 'layout');
    return { ok: true as const };
  }

  if (!session.stores.some((s) => s.id === storeId)) {
    return { ok: false as const, error: 'Punto vendita non accessibile' };
  }

  cookieStore.set(ACTIVE_STORE_COOKIE, String(storeId), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: ONE_YEAR,
  });

  revalidatePath('/', 'layout');
  return { ok: true as const };
}
