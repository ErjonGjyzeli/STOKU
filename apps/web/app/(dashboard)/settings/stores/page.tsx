import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { StoresClient } from './stores-client';

export const metadata = { title: 'Punti vendita — STOKU' };

export default async function StoresSettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('stores')
    .select('id, code, name, type, city, country, address_line1, postal_code, phone, email, is_active')
    .order('code');

  if (error) {
    return <p className="text-destructive text-sm">Errore: {error.message}</p>;
  }

  return <StoresClient stores={data ?? []} />;
}
