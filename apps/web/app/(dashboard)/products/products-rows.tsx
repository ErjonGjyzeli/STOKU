'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Icon } from '@/components/ui/icon';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { toggleProductActive, updateProduct, type ProductInput } from './actions';
import {
  ProductCompatibilityDialog,
  type CompatVehicle,
} from './product-compatibility-dialog';
import { ProductFormDialog, type ProductFormValues } from './product-form-dialog';
import { ProductPhotoDialog, type ProductImage } from './product-photo-dialog';

type BadgeVariant = 'default' | 'ok' | 'warn' | 'danger' | 'info' | 'draft' | 'accent';

const CONDITION_LABEL: Record<string, string> = {
  new: 'Nuovo',
  used: 'Usato',
  refurbished: 'Rigenerato',
  damaged: 'Danneggiato',
};

const CONDITION_VARIANT: Record<string, BadgeVariant> = {
  new: 'ok',
  used: 'default',
  refurbished: 'info',
  damaged: 'warn',
};

export type ProductRow = {
  id: string;
  sku: string;
  legacy_nr: string | null;
  name: string;
  condition: string;
  price_sell: number | null;
  price_cost: number | null;
  currency: string | null;
  is_active: boolean | null;
  oem_code: string | null;
  description: string | null;
  category: { id: number; name: string } | null;
  stock: { available: number; total: number } | null;
  images: ProductImage[];
  vehicleIds: number[];
};

type Category = { id: number; name: string };

function currency(value: number | null, code: string | null) {
  if (value == null) return null;
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: code ?? 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function toFormValues(p: ProductRow): ProductFormValues {
  return {
    sku: p.sku,
    name: p.name,
    legacy_nr: p.legacy_nr ?? '',
    oem_code: p.oem_code ?? '',
    category_id: p.category?.id ? String(p.category.id) : '',
    condition: (p.condition as ProductFormValues['condition']) ?? 'used',
    price_sell: p.price_sell != null ? String(p.price_sell) : '',
    price_cost: p.price_cost != null ? String(p.price_cost) : '',
    description: p.description ?? '',
    is_active: !!p.is_active,
  };
}

export function ProductsRows({
  products: initialProducts,
  categories,
  allVehicles,
}: {
  products: ProductRow[];
  categories: Category[];
  allVehicles: CompatVehicle[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [photosFor, setPhotosFor] = useState<ProductRow | null>(null);
  const [compatFor, setCompatFor] = useState<ProductRow | null>(null);
  const [pending, startTransition] = useTransition();

  function handleToggle(product: ProductRow) {
    startTransition(async () => {
      const res = await toggleProductActive(product.id, !product.is_active);
      if (!res.ok) toast.error('Errore', { description: res.error });
      else toast.success(product.is_active ? 'Disattivato' : 'Attivato');
    });
  }

  async function handleEditSubmit(values: ProductInput) {
    if (!editing) return false;
    const res = await updateProduct(editing.id, values);
    if (!res.ok) {
      toast.error('Aggiornamento fallito', { description: res.error });
      return false;
    }
    toast.success('Prodotto aggiornato');
    return true;
  }

  return (
    <>
      <tbody>
        {products.map((p) => {
          const price = currency(p.price_sell, p.currency);
          return (
            <tr key={p.id}>
              <td className="mono" style={{ fontWeight: 500, fontSize: 11 }}>
                {p.sku}
              </td>
              <td className="truncate-1" style={{ maxWidth: 320 }}>
                {p.name}
                {p.legacy_nr && (
                  <span className="faint mono" style={{ marginLeft: 8, fontSize: 11 }}>
                    #{p.legacy_nr}
                  </span>
                )}
              </td>
              <td>
                {p.category?.name ? (
                  <StokuBadge>{p.category.name}</StokuBadge>
                ) : (
                  <span className="faint">—</span>
                )}
              </td>
              <td>
                <StokuBadge variant={CONDITION_VARIANT[p.condition] ?? 'default'}>
                  {CONDITION_LABEL[p.condition] ?? p.condition}
                </StokuBadge>
              </td>
              <td className="mono" style={{ textAlign: 'right' }}>
                {price ?? <span className="faint">—</span>}
              </td>
              <td className="mono" style={{ textAlign: 'right' }}>
                {p.stock ? (
                  <span style={{ color: p.stock.available > 0 ? undefined : 'var(--ink-3)' }}>
                    {p.stock.available}
                  </span>
                ) : (
                  <span className="faint">0</span>
                )}
              </td>
              <td>
                {p.is_active ? (
                  <StokuBadge variant="ok" dot>
                    Attivo
                  </StokuBadge>
                ) : (
                  <StokuBadge variant="draft">Disattivato</StokuBadge>
                )}
              </td>
              <td>
                <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{ width: 24, padding: 0, justifyContent: 'center' }}
                    onClick={() => setCompatFor(p)}
                    title={
                      p.vehicleIds.length > 0
                        ? `Veicoli compatibili (${p.vehicleIds.length})`
                        : 'Compatibilità veicoli'
                    }
                    aria-label="Compatibilità veicoli"
                  >
                    <Icon name="car" size={12} />
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{ width: 24, padding: 0, justifyContent: 'center' }}
                    onClick={() => setPhotosFor(p)}
                    title={p.images.length > 0 ? `Foto (${p.images.length})` : 'Gestisci foto'}
                    aria-label="Gestisci foto"
                  >
                    <Icon name="image" size={12} />
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{ width: 24, padding: 0, justifyContent: 'center' }}
                    onClick={() => setEditing(p)}
                    title="Modifica"
                    aria-label="Modifica"
                  >
                    <Icon name="edit" size={12} />
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{ width: 24, padding: 0, justifyContent: 'center' }}
                    onClick={() => handleToggle(p)}
                    disabled={pending}
                    title={p.is_active ? 'Disattiva' : 'Attiva'}
                    aria-label={p.is_active ? 'Disattiva' : 'Attiva'}
                  >
                    <Icon name="ring" size={12} />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>

      {editing && (
        <ProductFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          onSubmit={handleEditSubmit}
          title={`Modifica ${editing.sku}`}
          categories={categories}
          initial={toFormValues(editing)}
        />
      )}
      {photosFor && (
        <ProductPhotoDialog
          open={!!photosFor}
          onOpenChange={(o) => !o && setPhotosFor(null)}
          productId={photosFor.id}
          productSku={photosFor.sku}
          initialImages={photosFor.images}
        />
      )}
      {compatFor && (
        <ProductCompatibilityDialog
          open={!!compatFor}
          onOpenChange={(o) => !o && setCompatFor(null)}
          productId={compatFor.id}
          productSku={compatFor.sku}
          allVehicles={allVehicles}
          initialSelected={compatFor.vehicleIds}
          onSaved={(ids) =>
            setProducts((prev) =>
              prev.map((p) => (p.id === compatFor.id ? { ...p, vehicleIds: ids } : p)),
            )
          }
        />
      )}
    </>
  );
}
