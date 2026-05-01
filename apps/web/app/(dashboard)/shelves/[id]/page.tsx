import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Scaffale — STOKU' };

const KIND_LABEL: Record<string, string> = {
  open: 'Aperto',
  cabinet: 'Armadio',
  drawer: 'Cassettiera',
  floor: 'Pavimento',
};

const idSchema = z.string().uuid();

const BUCKET_PUBLIC_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images`;

function publicUrl(path: string) {
  return `${BUCKET_PUBLIC_URL}/${path}`;
}

export default async function ShelfDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const idCheck = idSchema.safeParse(id);
  if (!idCheck.success) notFound();

  const supabase = await createClient();

  const { data: shelf, error: shelfErr } = await supabase
    .from('shelves')
    .select(
      'id, code, description, kind, capacity, is_active, store_id, store:stores(id, code, name)',
    )
    .eq('id', idCheck.data)
    .maybeSingle();
  if (shelfErr) {
    return <p style={{ padding: 24, color: 'var(--danger)' }}>Errore: {shelfErr.message}</p>;
  }
  if (!shelf) notFound();

  // Stock dello scaffale + dati prodotto + foto primaria.
  const { data: stockRows } = await supabase
    .from('stock')
    .select(
      'product_id, quantity, reserved_quantity, product:products(id, sku, name, legacy_nr, is_active)',
    )
    .eq('shelf_id', shelf.id)
    .order('product_id');

  const items = stockRows ?? [];
  const productIds = items.map((r) => r.product_id);
  const imagesMap = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: imgs } = await supabase
      .from('product_images')
      .select('product_id, storage_path, is_primary, sort_order')
      .in('product_id', productIds)
      .order('is_primary', { ascending: false })
      .order('sort_order');
    for (const img of imgs ?? []) {
      if (!img.product_id || imagesMap.has(img.product_id)) continue;
      imagesMap.set(img.product_id, img.storage_path);
    }
  }

  const totalPieces = items.reduce((acc, r) => acc + (r.quantity ?? 0), 0);
  const reservedPieces = items.reduce((acc, r) => acc + (r.reserved_quantity ?? 0), 0);
  const uniqueProducts = items.length;
  const fillPercent =
    shelf.capacity && shelf.capacity > 0
      ? Math.min(100, Math.round((totalPieces / shelf.capacity) * 100))
      : null;

  const kindLabel = KIND_LABEL[shelf.kind] ?? shelf.kind;
  const futureTooltip = 'Disponibile in PR successiva';

  return (
    <div>
      <PageHeader
        breadcrumb={[
          { label: 'Scaffali', href: '/shelves' },
          { label: shelf.code },
        ]}
        title={
          <span className="row" style={{ gap: 10, alignItems: 'center' }}>
            <span className="mono">{shelf.code}</span>
            <StokuBadge>{kindLabel}</StokuBadge>
            {!shelf.is_active && <StokuBadge variant="draft">Disattivato</StokuBadge>}
          </span>
        }
        subtitle={
          <span>
            {shelf.store?.code ? `${shelf.store.code} · ${shelf.store.name}` : ''}
            {shelf.description ? ` — ${shelf.description}` : ''}
          </span>
        }
        right={
          <div className="row" style={{ gap: 6 }}>
            <Link href="/shelves" className="btn ghost sm">
              <Icon name="chevronLeft" size={12} /> Lista
            </Link>
            <button
              type="button"
              className="btn ghost sm"
              disabled
              title={futureTooltip}
              aria-label="Sposta prodotto"
            >
              <Icon name="swap" size={12} /> Sposta
            </button>
            <Link
              href={`/shelves/${shelf.id}/label?format=thermal`}
              target="_blank"
              rel="noreferrer"
              className="btn ghost sm"
              aria-label="Stampa etichetta termica"
              title="PDF singolo 80×50mm"
            >
              <Icon name="print" size={12} /> Termica
            </Link>
            <Link
              href={`/labels/pdf?kind=shelves&ids=${shelf.id}&format=a4`}
              target="_blank"
              rel="noreferrer"
              className="btn ghost sm"
              aria-label="Stampa etichetta in foglio A4"
              title="PDF A4 24-up"
            >
              <Icon name="tag" size={12} /> A4
            </Link>
            <button
              type="button"
              className="btn ghost sm"
              disabled
              title={futureTooltip}
              aria-label="Inventario"
            >
              <Icon name="check" size={12} /> Inventario
            </button>
          </div>
        }
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          className="row"
          style={{ gap: 12, flexWrap: 'wrap', alignItems: 'stretch' }}
        >
          <Stat label="Prodotti unici" value={uniqueProducts.toString()} />
          <Stat label="Pezzi totali" value={totalPieces.toString()} />
          <Stat
            label="Riservati"
            value={reservedPieces > 0 ? reservedPieces.toString() : '—'}
          />
          <Stat
            label="Capacità"
            value={shelf.capacity ? shelf.capacity.toString() : '—'}
          />
          <Stat
            label="Riempimento"
            value={fillPercent !== null ? `${fillPercent}%` : '—'}
          />
        </div>

        <Panel padded={false}>
          {items.length === 0 ? (
            <Empty
              icon="box"
              title="Scaffale vuoto"
              subtitle="Nessun prodotto attualmente collocato qui."
            />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 56 }} />
                  <th style={{ width: 130 }}>SKU</th>
                  <th>Prodotto</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Qta</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Prenot.</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Disp.</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const path = imagesMap.get(row.product_id);
                  const available = (row.quantity ?? 0) - (row.reserved_quantity ?? 0);
                  return (
                    <tr key={row.product_id}>
                      <td>
                        {path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={publicUrl(path)}
                            alt=""
                            width={36}
                            height={36}
                            style={{
                              objectFit: 'cover',
                              borderRadius: 4,
                              background: 'var(--panel-2)',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 4,
                              background: 'var(--panel-2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--ink-4)',
                            }}
                          >
                            <Icon name="image" size={14} />
                          </div>
                        )}
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        <Link
                          href={`/products?q=${encodeURIComponent(row.product?.sku ?? '')}`}
                          style={{ color: 'inherit' }}
                        >
                          {row.product?.sku ?? '—'}
                        </Link>
                      </td>
                      <td className="truncate-1">
                        {row.product?.name ?? <span className="faint">—</span>}
                        {row.product?.legacy_nr && (
                          <span className="faint mono" style={{ marginLeft: 8, fontSize: 11 }}>
                            #{row.product.legacy_nr}
                          </span>
                        )}
                        {row.product?.is_active === false && (
                          <StokuBadge variant="draft" style={{ marginLeft: 8 }}>
                            Disattivato
                          </StokuBadge>
                        )}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {row.quantity ?? 0}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>
                        {row.reserved_quantity && row.reserved_quantity > 0
                          ? row.reserved_quantity
                          : '—'}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 500 }}>
                        {available}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--stoku-border)',
        borderRadius: 'var(--r-lg)',
        padding: '12px 16px',
        minWidth: 140,
      }}
    >
      <div
        className="meta"
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  );
}
