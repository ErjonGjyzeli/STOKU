import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { CustomersClient, type CustomerRow } from './customers-client';

export const metadata = { title: 'Clienti — STOKU' };

export default async function CustomersPage() {
  await requireSession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('customers')
    .select(
      'id, code, type, name, vat_number, tax_code, email, phone, address_line1, city, postal_code, country, notes',
    )
    .order('name');

  if (error) {
    return <p style={{ padding: 24, color: 'var(--danger)' }}>Errore: {error.message}</p>;
  }

  const rows: CustomerRow[] = data ?? [];
  return <CustomersClient customers={rows} total={rows.length} />;
}
