import { Suspense } from 'react';

import { PageHeader } from '@/components/ui/page-header';
import { requireSession } from '@/lib/auth/session';
import { ScannerClient } from './scanner-client';

export const metadata = { title: 'Scanner — STOKU' };

// Spec §7.bis "Pagina Scanner integrata in app". Server component minimo:
// auth-required + intestazione + boundary attorno al client component che
// gestisce camera/USB-HID.
export default async function ScannerPage() {
  await requireSession();

  return (
    <div>
      <PageHeader
        title="Scanner"
        subtitle="Fotocamera continua o scanner USB — scansioni multiple di seguito"
      />

      <div style={{ padding: 24 }}>
        <Suspense fallback={null}>
          <ScannerClient />
        </Suspense>
      </div>
    </div>
  );
}
