import { PageHeader } from '@/components/ui/page-header';
import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { CompanyForm, type CompanyFormValues } from './company-form';

export const metadata = { title: 'Të dhënat e kompanisë — STOKU' };

export default async function CompanySettingsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from('company_settings')
    .select('*')
    .eq('id', 1)
    .single();

  const initial: CompanyFormValues = {
    legal_name: data?.legal_name ?? '',
    vat_number: data?.vat_number ?? '',
    tax_code: data?.tax_code ?? '',
    address_line1: data?.address_line1 ?? '',
    city: data?.city ?? '',
    postal_code: data?.postal_code ?? '',
    country: data?.country ?? 'AL',
    phone: data?.phone ?? '',
    email: data?.email ?? '',
    iban: data?.iban ?? '',
    bank_name: data?.bank_name ?? '',
    logo_url: data?.logo_url ?? '',
    invoice_footer: data?.invoice_footer ?? '',
    default_tax_rate: data?.default_tax_rate != null ? String(data.default_tax_rate) : '20',
  };

  return (
    <div>
      <PageHeader
        title="Të dhënat e kompanisë"
        subtitle="Emri ligjor, NIPT, selia, koordinatat bankare dhe footer i faturës."
        breadcrumb={[{ label: 'Cilësimet' }, { label: 'Kompania' }]}
      />
      <div style={{ padding: 24, maxWidth: 800 }}>
        <CompanyForm initial={initial} />
      </div>
    </div>
  );
}
