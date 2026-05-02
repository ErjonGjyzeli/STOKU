'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { StokuButton } from '@/components/ui/stoku-button';
import { createProduct, type ProductInput } from './actions';
import { ProductFormDialog } from './product-form-dialog';

type Category = { id: number; name: string };

export function ProductsCreateButton({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(values: ProductInput) {
    const res = await createProduct(values);
    if (!res.ok) {
      toast.error('Krijimi dështoi', { description: res.error });
      return false;
    }
    toast.success('Produkti u krijua');
    return true;
  }

  return (
    <>
      <StokuButton icon="plus" variant="primary" onClick={() => setOpen(true)}>
        Produkt i ri
      </StokuButton>
      <ProductFormDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={handleSubmit}
        title="Produkt i ri"
        categories={categories}
      />
    </>
  );
}
