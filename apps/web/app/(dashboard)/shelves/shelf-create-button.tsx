'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { StokuButton } from '@/components/ui/stoku-button';
import { createShelf, type ShelfInput } from './actions';
import { ShelfFormDialog } from './shelf-form-dialog';

type StoreOption = { id: number; code: string; name: string };

type Props = {
  stores: StoreOption[];
  defaultStoreId: number | null;
};

export function ShelfCreateButton({ stores, defaultStoreId }: Props) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(values: ShelfInput) {
    const res = await createShelf(values);
    if (!res.ok) {
      toast.error('Errore', { description: res.error });
      return false;
    }
    toast.success('Scaffale creato');
    return true;
  }

  return (
    <>
      <StokuButton
        icon="plus"
        variant="primary"
        onClick={() => setOpen(true)}
        disabled={stores.length === 0}
        title={stores.length === 0 ? 'Nessun PV accessibile' : undefined}
      >
        Nuovo scaffale
      </StokuButton>
      <ShelfFormDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={handleSubmit}
        title="Nuovo scaffale"
        stores={stores}
        defaultStoreId={defaultStoreId}
      />
    </>
  );
}
