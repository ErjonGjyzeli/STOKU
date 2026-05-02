'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { StokuButton } from '@/components/ui/stoku-button';
import { createTire, type TireInput } from './actions';
import { TireFormDialog } from './tire-form-dialog';

type Category = { id: number; name: string; slug: string };

export function TiresCreateButton({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(values: TireInput) {
    const res = await createTire(values);
    if (!res.ok) {
      toast.error('Krijimi dështoi', { description: res.error });
      return false;
    }
    toast.success('Goma u krijua');
    return true;
  }

  return (
    <>
      <StokuButton icon="plus" variant="primary" onClick={() => setOpen(true)}>
        Gomë e re
      </StokuButton>
      <TireFormDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={handleSubmit}
        title="Gomë e re"
        categories={categories}
      />
    </>
  );
}
