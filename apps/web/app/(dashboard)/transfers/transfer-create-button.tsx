'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { StokuButton } from '@/components/ui/stoku-button';
import { TransferFormDialog, type StoreOption } from './transfer-form-dialog';

type Props = {
  stores: StoreOption[];
  defaultFromStoreId: number | null;
};

export function TransferCreateButton({ stores, defaultFromStoreId }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  /* eslint-disable react-hooks/set-state-in-effect -- reaction al query param */
  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    setOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('new');
    const qs = params.toString();
    router.replace(qs ? `/transfers?${qs}` : '/transfers');
  }, [searchParams, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <>
      <StokuButton icon="plus" variant="primary" onClick={() => setOpen(true)}>
        <span>Nuovo trasferimento</span>
      </StokuButton>
      <TransferFormDialog
        open={open}
        onOpenChange={setOpen}
        stores={stores}
        defaultFromStoreId={defaultFromStoreId}
      />
    </>
  );
}
