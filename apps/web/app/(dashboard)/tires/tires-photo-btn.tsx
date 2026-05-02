'use client';

import { useState } from 'react';

import { Icon } from '@/components/ui/icon';
import { ProductPhotoDialog, type ProductImage } from '../products/product-photo-dialog';

export function TiresPhotoBtn({
  productId,
  productSku,
  images,
}: {
  productId: string;
  productSku: string;
  images: ProductImage[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn ghost sm"
        style={{ width: 24, padding: 0, justifyContent: 'center' }}
        onClick={() => setOpen(true)}
        title={images.length > 0 ? `Foto (${images.length})` : 'Ngarko foto'}
        aria-label="Foto"
      >
        <Icon name="image" size={12} />
      </button>
      <ProductPhotoDialog
        open={open}
        onOpenChange={setOpen}
        productId={productId}
        productSku={productSku}
        initialImages={images}
      />
    </>
  );
}
