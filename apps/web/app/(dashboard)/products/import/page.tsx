import Link from 'next/link';

import { PageHeader } from '@/components/ui/page-header';
import { requireSession } from '@/lib/auth/session';
import { ImportForm } from './import-form';

export const metadata = { title: 'Import prodotti — STOKU' };

export default async function ProductsImportPage() {
  await requireSession();

  return (
    <div>
      <PageHeader
        title="Import prodotti da Excel"
        subtitle="Carica il foglio Excel storico. SKU auto (P-000001…), max 10.000 righe per import."
        breadcrumb={[
          { label: 'Inventario' },
          { label: 'Import' },
        ]}
        right={
          <Link href="/products" className="btn ghost sm">
            Torna all&apos;inventario
          </Link>
        }
      />
      <div style={{ padding: 24 }}>
        <ImportForm />
      </div>
    </div>
  );
}
