'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { StokuButton } from '@/components/ui/stoku-button';
import { OrderFormDialog, type CustomerOption, type StoreOption } from './order-form-dialog';

type Props = {
  customers: CustomerOption[];
  stores: StoreOption[];
  defaultStoreId: number | null;
};

export function OrderCreateButton({ customers, stores, defaultStoreId }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Se l'utente arriva con ?new=1 (es. dal bottone topbar da un'altra route),
  // apriamo automaticamente la modal e puliamo l'URL.
  /* eslint-disable react-hooks/set-state-in-effect -- reaction al query param */
  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    setOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('new');
    const qs = params.toString();
    router.replace(qs ? `/orders?${qs}` : '/orders');
  }, [searchParams, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <>
      <StokuButton icon="plus" variant="primary" onClick={() => setOpen(true)}>
        <span>Nuovo ordine</span>
      </StokuButton>
      <OrderFormDialog
        open={open}
        onOpenChange={setOpen}
        customers={customers}
        stores={stores}
        defaultStoreId={defaultStoreId}
      />
    </>
  );
}
