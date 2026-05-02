'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Icon } from '@/components/ui/icon';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { formatCurrency } from '@/lib/format';
import { toggleProductActive, updateProduct, type ProductInput } from './actions';
import { ProductFormDialog, type ProductFormValues } from './product-form-dialog';
import { ProductPhotoDialog, type ProductImage } from './product-photo-dialog';

type BadgeVariant = 'default' | 'ok' | 'warn' | 'danger' | 'info' | 'draft' | 'accent';

const CONDITION_LABEL: Record<string, string> = {
  new: 'I ri',
  used: 'I përdorur',
  refurbished: 'I rinovuar',
  damaged: 'I dëmtuar',
};

const CONDITION_VARIANT: Record<string, BadgeVariant> = {
  new: 'ok',
  used: 'default',
  refurbished: 'info',
  damaged: 'warn',
};

type PerStore = { storeId: number; storeCode: string; available: number };

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
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year_from: number | null;
  vehicle_year_to: number | null;
  description: string | null;
  category: { id: number; name: string } | null;
  stock: { available: number; total: number } | null;
  perStore: PerStore[] | null;
  images: ProductImage[];
};

type Category = { id: number; name: string };

function currency(value: number | null, code: string | null) {
  if (value == null) return null;
  return formatCurrency(value, code);
}

function toFormValues(p: ProductRow): ProductFormValues {
  return {
    sku: p.sku,
    name: p.name,
    legacy_nr: p.legacy_nr ?? '',
    category_id: p.category?.id ? String(p.category.id) : '',
    condition: (p.condition as ProductFormValues['condition']) ?? 'used',
    price_sell: p.price_sell != null ? String(p.price_sell) : '',
    price_cost: p.price_cost != null ? String(p.price_cost) : '',
    description: p.description ?? '',
    is_active: !!p.is_active,
    vehicle_make: p.vehicle_make ?? '',
    vehicle_model: p.vehicle_model ?? '',
    vehicle_year_from: p.vehicle_year_from != null ? String(p.vehicle_year_from) : '',
    vehicle_year_to: p.vehicle_year_to != null ? String(p.vehicle_year_to) : '',
    oem_code: p.oem_code ?? '',
  };
}

function StoreDots({ perStore }: { perStore: PerStore[] | null }) {
  if (!perStore || perStore.length === 0) return <span className="faint">—</span>;
  return (
    <div className="row" style={{ gap: 6 }}>
      {perStore.map((s) => (
        <div
          key={s.storeId}
          className="row"
          style={{ gap: 4 }}
          title={`${s.storeCode}: ${s.available} disp.`}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              flexShrink: 0,
              background:
                s.available === 0
                  ? 'var(--ink-4)'
                  : s.available <= 2
                    ? 'var(--warn)'
                    : 'var(--ok)',
            }}
          />
          <span
            className="mono"
            style={{ fontSize: 10, color: 'var(--ink-3)' }}
          >
            {s.storeCode}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ProductsRows({
  products: initialProducts,
  categories,
}: {
  products: ProductRow[];
  categories: Category[];
}) {
  const [products] = useState(initialProducts);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [photosFor, setPhotosFor] = useState<ProductRow | null>(null);
  const [pending, startTransition] = useTransition();

  function handleToggle(product: ProductRow) {
    startTransition(async () => {
      const res = await toggleProductActive(product.id, !product.is_active);
      if (!res.ok) toast.error('Errore', { description: res.error });
      else toast.success(product.is_active ? 'Çaktivizuar' : 'Aktivizuar');
    });
  }

  async function handleEditSubmit(values: ProductInput) {
    if (!editing) return false;
    const res = await updateProduct(editing.id, values);
    if (!res.ok) {
      toast.error('Përditësimi dështoi', { description: res.error });
      return false;
    }
    toast.success('Produkti u përditësua');
    return true;
  }

  return (
    <>
      <tbody>
        {products.map((p) => {
          const price = currency(p.price_sell, p.currency);
          const hasPhoto = p.images.length > 0;
          return (
            <tr key={p.id}>
              {/* Thumb */}
              <td style={{ padding: '0 6px 0 10px' }}>
                <Link href={`/products/${p.id}`}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--r-sm)',
                      border: '1px solid var(--border)',
                      background: hasPhoto ? 'var(--panel-sunken)' : undefined,
                      backgroundImage: !hasPhoto
                        ? `repeating-linear-gradient(45deg, oklch(0.88 0.005 80) 0 4px, oklch(0.94 0.004 80) 4px 8px)`
                        : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--ink-4)',
                      flexShrink: 0,
                    }}
                  >
                    {hasPhoto && <Icon name="image" size={12} />}
                  </div>
                </Link>
              </td>

              {/* Prodotto: name + description */}
              <td style={{ maxWidth: 280 }}>
                <Link href={`/products/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  <div className="col" style={{ gap: 1, minWidth: 0 }}>
                    <span
                      className="truncate-1"
                      style={{ fontSize: 11, fontWeight: 500 }}
                    >
                      {p.name}
                    </span>
                    {p.description && (
                      <span
                        className="meta truncate-1"
                        style={{ fontSize: 10 }}
                      >
                        {p.description}
                      </span>
                    )}
                  </div>
                </Link>
              </td>

              {/* SKU / OEM */}
              <td>
                <div className="col" style={{ gap: 0 }}>
                  <span className="mono" style={{ fontSize: 11 }}>{p.sku}</span>
                  {p.oem_code && (
                    <span className="mono meta" style={{ fontSize: 10 }}>{p.oem_code}</span>
                  )}
                </div>
              </td>

              {/* Veicolo */}
              <td>
                {p.vehicle_make ? (
                  <div className="col" style={{ gap: 0 }}>
                    <span style={{ fontSize: 11 }}>
                      {p.vehicle_make} {p.vehicle_model}
                    </span>
                    {(p.vehicle_year_from || p.vehicle_year_to) && (
                      <span className="meta" style={{ fontSize: 10 }}>
                        {p.vehicle_year_from ?? '?'}–{p.vehicle_year_to ?? '?'}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="faint">—</span>
                )}
              </td>

              {/* Condizione */}
              <td>
                <StokuBadge variant={CONDITION_VARIANT[p.condition] ?? 'default'}>
                  {CONDITION_LABEL[p.condition] ?? p.condition}
                </StokuBadge>
              </td>

              {/* Stock per punto */}
              <td>
                <StoreDots perStore={p.perStore} />
              </td>

              {/* Disponibile */}
              <td className="mono" style={{ textAlign: 'right' }}>
                {p.stock ? (
                  <span style={{ color: p.stock.available > 0 ? undefined : 'var(--ink-3)' }}>
                    {p.stock.available}
                  </span>
                ) : (
                  <span className="faint">0</span>
                )}
              </td>

              {/* Prezzo */}
              <td className="mono" style={{ textAlign: 'right' }}>
                {price ?? <span className="faint">—</span>}
              </td>

              {/* Azioni */}
              <td>
                <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                  <a
                    href={`/products/${p.id}/label`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn ghost sm"
                    style={{ width: 24, padding: 0, justifyContent: 'center' }}
                    title="Printo etiketë QR"
                    aria-label="Etiketë QR"
                  >
                    <Icon name="qr" size={12} />
                  </a>
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{ width: 24, padding: 0, justifyContent: 'center' }}
                    onClick={() => setPhotosFor(p)}
                    title={p.images.length > 0 ? `Foto (${p.images.length})` : 'Menaxho fotot'}
                    aria-label="Menaxho fotot"
                  >
                    <Icon name="image" size={12} />
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{ width: 24, padding: 0, justifyContent: 'center' }}
                    onClick={() => setEditing(p)}
                    title="Modifiko"
                    aria-label="Modifiko"
                  >
                    <Icon name="edit" size={12} />
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{ width: 24, padding: 0, justifyContent: 'center' }}
                    onClick={() => handleToggle(p)}
                    disabled={pending}
                    title={p.is_active ? 'Çaktivizo' : 'Aktivizo'}
                    aria-label={p.is_active ? 'Çaktivizo' : 'Aktivizo'}
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
          title={`Modifiko ${editing.sku}`}
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
    </>
  );
}
