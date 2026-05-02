import { Suspense } from 'react';

import { requireSession } from '@/lib/auth/session';
import { ScannerClient } from './scanner-client';

export const metadata = { title: 'Scanner — STOKU' };

export default async function ScannerPage() {
  const session = await requireSession();
  const store =
    session.stores.find((s) => s.id === session.activeStoreId) ?? session.stores[0];

  return (
    <Suspense fallback={null}>
      <ScannerClient
        storeCode={store?.code ?? ''}
        activeStoreId={session.activeStoreId}
        userName={session.profile.full_name ?? ''}
      />
    </Suspense>
  );
}
