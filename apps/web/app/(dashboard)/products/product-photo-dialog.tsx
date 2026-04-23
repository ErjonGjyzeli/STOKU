'use client';

import Image from 'next/image';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { deleteProductImage, setPrimaryImage, uploadProductImage } from './actions';

export type ProductImage = {
  id: string;
  storage_path: string;
  is_primary: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productSku: string;
  initialImages: ProductImage[];
};

const BUCKET_PUBLIC_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images`;

function publicUrl(path: string) {
  return `${BUCKET_PUBLIC_URL}/${path}`;
}

export function ProductPhotoDialog({
  open,
  onOpenChange,
  productId,
  productSku,
  initialImages,
}: Props) {
  const [images, setImages] = useState<ProductImage[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: ProductImage[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('product_id', productId);
      fd.append('file', file);
      const res = await uploadProductImage(fd);
      if (!res.ok) {
        toast.error('Upload fallito', { description: `${file.name}: ${res.error}` });
        continue;
      }
      uploaded.push({
        id: res.data.id,
        storage_path: res.data.storage_path,
        is_primary: images.length === 0 && uploaded.length === 0,
      });
    }
    if (uploaded.length > 0) {
      toast.success(`${uploaded.length} foto caricate`);
      setImages((prev) => [...prev, ...uploaded]);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleSetPrimary(img: ProductImage) {
    startTransition(async () => {
      const res = await setPrimaryImage(productId, img.id);
      if (!res.ok) {
        toast.error('Errore', { description: res.error });
        return;
      }
      toast.success('Foto principale aggiornata');
      setImages((prev) => prev.map((i) => ({ ...i, is_primary: i.id === img.id })));
    });
  }

  function handleDelete(img: ProductImage) {
    if (!confirm('Eliminare questa foto?')) return;
    startTransition(async () => {
      const res = await deleteProductImage(img.id);
      if (!res.ok) {
        toast.error('Errore', { description: res.error });
        return;
      }
      toast.success('Foto eliminata');
      setImages((prev) => prev.filter((i) => i.id !== img.id));
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Foto {productSku}</DialogTitle>
          <DialogDescription>
            Massimo 5 MB per foto · JPEG, PNG, WebP · La stella segna la foto principale.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="row" style={{ gap: 8 }}>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <Button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              variant="default"
            >
              <Icon name="image" size={14} />
              {uploading ? 'Caricamento…' : 'Carica foto'}
            </Button>
            <span className="meta" style={{ fontSize: 12 }}>
              {images.length === 0
                ? 'Nessuna foto ancora'
                : `${images.length} foto · prima foto = principale`}
            </span>
          </div>

          {images.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 10,
              }}
            >
              {images.map((img) => (
                <div
                  key={img.id}
                  style={{
                    position: 'relative',
                    aspectRatio: '1 / 1',
                    borderRadius: 'var(--r-md)',
                    overflow: 'hidden',
                    border: img.is_primary
                      ? '2px solid var(--stoku-accent)'
                      : '1px solid var(--stoku-border)',
                    background: 'var(--panel-2)',
                  }}
                >
                  <Image
                    src={publicUrl(img.storage_path)}
                    alt=""
                    fill
                    sizes="160px"
                    style={{ objectFit: 'cover' }}
                    unoptimized
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 'auto 4px 4px 4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 4,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(img)}
                      disabled={pending || img.is_primary}
                      className="btn sm"
                      title={img.is_primary ? 'Principale' : 'Imposta come principale'}
                      aria-label="Imposta come principale"
                      style={{
                        background: img.is_primary ? 'var(--stoku-accent)' : 'rgba(0,0,0,0.55)',
                        color: img.is_primary ? 'var(--stoku-accent-fg)' : '#fff',
                        border: 'none',
                        padding: 6,
                        width: 28,
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="star" size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(img)}
                      disabled={pending}
                      className="btn danger sm"
                      title="Elimina"
                      aria-label="Elimina foto"
                      style={{
                        background: 'rgba(0,0,0,0.55)',
                        color: '#fff',
                        border: 'none',
                        padding: 6,
                        width: 28,
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
