import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { StokuButton } from '@/components/ui/stoku-button';
import { requireSession } from '@/lib/auth/session';
import { formatCurrency, formatDayMonthShort } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

const CONDITION_LABEL: Record<string, string> = {
  new: 'I ri',
  used: 'I përdorur',
  refurbished: 'I rinovuar',
  damaged: 'I dëmtuar',
};

type BadgeVariant = 'default' | 'ok' | 'warn' | 'danger' | 'info' | 'draft' | 'accent';

const CONDITION_VARIANT: Record<string, BadgeVariant> = {
  new: 'ok',
  used: 'default',
  refurbished: 'info',
  damaged: 'warn',
};

const MOVEMENT_LABEL: Record<string, string> = {
  sale: 'Shitje',
  return: 'Kthim',
  adjustment: 'Rregullim',
  intake: 'Ngarkim',
  damage: 'Humbje',
  transfer_out: 'Dalje transferim',
  transfer_in: 'Hyrje transferim',
  reservation: 'Rezervim',
  unreservation: 'Çlirim rezervimi',
};

function relativeTime(iso: string | null) {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'tani';
  if (minutes < 60) return `${minutes} min më parë`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} orë më parë`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'dje';
  if (days < 7) return `${days} ditë më parë`;
  return formatDayMonthShort(iso);
}

const MOVEMENT_ICON: Record<string, string> = {
  sale: 'cart',
  return: 'swap',
  adjustment: 'edit',
  intake: 'box',
  damage: 'alert',
  transfer_out: 'truck',
  transfer_in: 'truck',
  reservation: 'clock',
  unreservation: 'swap',
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;

  const supabase = await createClient();

  const [productRes, stockRes, imagesRes, movementsRes] = await Promise.all([
    supabase
      .from('products')
      .select(
        'id, sku, legacy_nr, name, condition, oem_code, vehicle_make, vehicle_model, vehicle_year_from, vehicle_year_to, description, price_sell, price_cost, currency, is_active, category:product_categories(id, name)',
      )
      .eq('id', id)
      .single(),
    supabase
      .from('stock')
      .select('store_id, quantity, reserved_quantity, min_stock, store:stores(code, name)')
      .eq('product_id', id)
      .order('store_id'),
    supabase
      .from('product_images')
      .select('id, storage_path, is_primary, sort_order')
      .eq('product_id', id)
      .order('is_primary', { ascending: false })
      .order('sort_order')
      .limit(5),
    supabase
      .from('inventory_movements')
      .select(
        'id, created_at, reason, change, store:stores!inventory_movements_store_id_fkey(code)',
      )
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  if (productRes.error || !productRes.data) {
    notFound();
  }

  const p = productRes.data;
  const stockRows = stockRes.data ?? [];
  const images = imagesRes.data ?? [];
  const movements = movementsRes.data ?? [];

  const totalQuantity = stockRows.reduce((s, r) => s + (r.quantity ?? 0), 0);
  const totalReserved = stockRows.reduce((s, r) => s + (r.reserved_quantity ?? 0), 0);
  const totalAvailable = totalQuantity - totalReserved;

  const margin =
    p.price_sell && p.price_cost && p.price_sell > 0
      ? Math.round((1 - p.price_cost / p.price_sell) * 100)
      : null;

  const category = Array.isArray(p.category) ? p.category[0] : p.category;

  return (
    <div>
      <PageHeader
        title={p.name}
        breadcrumb={[
          { label: 'Produktet', href: '/products' },
          { label: p.sku },
        ]}
        subtitle={
          <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="mono">{p.sku}</span>
            {p.oem_code && (
              <>
                <span className="faint">·</span>
                <span className="mono meta">OEM {p.oem_code}</span>
              </>
            )}
            <span className="faint">·</span>
            <StokuBadge variant={CONDITION_VARIANT[p.condition] ?? 'default'}>
              {CONDITION_LABEL[p.condition] ?? p.condition}
            </StokuBadge>
          </span>
        }
        right={
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <a
              href={`/products/${p.id}/label`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn sm"
            >
              <Icon name="qr" size={12} /> Etiketa QR
            </a>
            <Link href={`/products/${p.id}/edit`} className="btn sm">
              <Icon name="edit" size={12} /> Modifiko
            </Link>
            <Link href={`/orders/new?addProductId=${p.id}`} className="btn primary">
              <Icon name="cart" size={13} /> Shto në porosi
            </Link>
          </div>
        }
      />

      <div
        className="product-detail-grid"
        style={{
          padding: 24,
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        {/* LEFT: gallery + description */}
        <div className="col" style={{ gap: 16 }}>
          <Panel padded={false}>
            <div style={{ padding: 16 }}>
              <div className="product-detail-gallery" style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10 }}>
                <div
                  style={{
                    aspectRatio: '4/3',
                    borderRadius: 'var(--r-md)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ink-3)',
                    backgroundImage: `repeating-linear-gradient(45deg, oklch(0.88 0.005 80) 0 4px, oklch(0.94 0.004 80) 4px 8px)`,
                  }}
                >
                  <div className="col" style={{ alignItems: 'center', gap: 4 }}>
                    <Icon name="image" size={28} />
                    <span className="meta" style={{ fontSize: 10 }}>
                      {images.length} foto</span>
                  </div>
                </div>
                <div className="col" style={{ gap: 6 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        aspectRatio: '1',
                        borderRadius: 'var(--r-sm)',
                        border: '1px solid var(--border)',
                        opacity: i < images.length ? 1 : 0.35,
                        backgroundImage: `repeating-linear-gradient(45deg, oklch(0.88 0.005 80) 0 4px, oklch(0.94 0.004 80) 4px 8px)`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Përshkrimi">
            {p.description ? (
              <div style={{ fontSize: 11, lineHeight: 1.55, color: 'var(--ink-2)' }}>
                {p.description}
              </div>
            ) : (
              <span className="faint">Asnjë përshkrim</span>
            )}
            <div
              className="product-detail-desc-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4,1fr)',
                gap: 12,
                marginTop: 14,
                paddingTop: 14,
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div className="meta" style={{ fontSize: 10 }}>
                  Kategoria
                </div>
                <div>{category?.name ?? '—'}</div>
              </div>
              <div>
                <div className="meta" style={{ fontSize: 10 }}>
                  Nr. i vjetër
                </div>
                <div className="mono" style={{ fontSize: 11 }}>
                  {p.legacy_nr ?? '—'}
                </div>
              </div>
              <div>
                <div className="meta" style={{ fontSize: 10 }}>
                  OEM
                </div>
                <div className="mono" style={{ fontSize: 11 }}>
                  {p.oem_code ?? '—'}
                </div>
              </div>
              <div>
                <div className="meta" style={{ fontSize: 10 }}>
                  Statusi
                </div>
                <div>
                  {p.is_active ? (
                    <StokuBadge variant="ok" dot>
                      Aktiv
                    </StokuBadge>
                  ) : (
                    <StokuBadge variant="draft">Çaktivizuar</StokuBadge>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          {(p.vehicle_make || p.vehicle_model) && (
            <Panel title="Përputhshmëria e mjetit">
              <div className="row" style={{ gap: 12 }}>
                <Icon name="car" size={14} />
                <div className="row" style={{ gap: 8, fontSize: 11 }}>
                  <span style={{ fontWeight: 500 }}>
                    {p.vehicle_make} {p.vehicle_model}
                  </span>
                  {(p.vehicle_year_from || p.vehicle_year_to) && (
                    <span className="meta">
                      {p.vehicle_year_from ?? '?'}–{p.vehicle_year_to ?? '?'}
                    </span>
                  )}
                </div>
              </div>
            </Panel>
          )}
        </div>

        {/* RIGHT: price + stock + history */}
        <div className="col" style={{ gap: 16 }}>
          <Panel title="Çmimi">
            <div className="row" style={{ gap: 16, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <div className="col" style={{ gap: 2 }}>
                <div className="meta" style={{ fontSize: 10 }}>
                  Shitje
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 24, fontWeight: 600 }}
                >
                  {p.price_sell != null
                    ? formatCurrency(p.price_sell, p.currency)
                    : <span className="faint">—</span>}
                </div>
              </div>
              {p.price_cost != null && (
                <>
                  <div style={{ width: 1, height: 32, background: 'var(--border)' }} />
                  <div className="col" style={{ gap: 2 }}>
                    <div className="meta" style={{ fontSize: 10 }}>
                      Kosto
                    </div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                      {formatCurrency(p.price_cost, p.currency)}
                    </div>
                  </div>
                  {margin != null && (
                    <div className="col" style={{ gap: 2 }}>
                      <div className="meta" style={{ fontSize: 10 }}>
                        Marzhi
                      </div>
                      <div
                        className="mono"
                        style={{ fontSize: 12, color: 'var(--ok)' }}
                      >
                        {margin}%
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Panel>

          <Panel
            title="Stoku për pikë"
            padded={false}
            right={
              <Link href="/transfers/new" className="btn ghost sm">
                <Icon name="swap" size={11} /> Transfero
              </Link>
            }
          >
            {stockRows.length === 0 ? (
              <Empty icon="box" title="Asnjë rekord stoku" subtitle="Asnjë stok i regjistruar." />
            ) : (
              <table className="tbl" style={{ marginTop: -4 }}>
                <thead>
                  <tr>
                    <th>Pika</th>
                    <th className="r">Totali</th>
                    <th className="r">Rez.</th>
                    <th className="r">Disp.</th>
                    <th className="r">Min</th>
                  </tr>
                </thead>
                <tbody>
                  {stockRows.map((s) => {
                    const store = Array.isArray(s.store) ? s.store[0] : s.store;
                    const avail = (s.quantity ?? 0) - (s.reserved_quantity ?? 0);
                    return (
                      <tr key={s.store_id} style={{ cursor: 'default' }}>
                        <td>
                          <div className="col" style={{ gap: 0 }}>
                            <span style={{ fontWeight: 500 }}>
                              {(store as { code: string } | null)?.code ?? String(s.store_id)}
                            </span>
                            {(store as { name?: string } | null)?.name && (
                              <span className="meta" style={{ fontSize: 10 }}>
                                {(store as { name: string }).name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="r mono">{s.quantity}</td>
                        <td
                          className="r mono"
                          style={{
                            color: (s.reserved_quantity ?? 0) > 0 ? 'var(--warn)' : 'var(--ink-4)',
                          }}
                        >
                          {s.reserved_quantity ?? 0}
                        </td>
                        <td
                          className="r mono"
                          style={{
                            fontWeight: 600,
                            color:
                              avail === 0
                                ? 'var(--danger)'
                                : avail <= (s.min_stock ?? 0)
                                  ? 'var(--warn)'
                                  : 'var(--ink)',
                          }}
                        >
                          {avail}
                        </td>
                        <td className="r mono meta">{s.min_stock ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      style={{
                        fontWeight: 600,
                        borderTop: '2px solid var(--border-strong)',
                        borderBottom: 'none',
                      }}
                    >
                      Totali
                    </td>
                    <td
                      className="r mono"
                      style={{
                        fontWeight: 600,
                        borderTop: '2px solid var(--border-strong)',
                        borderBottom: 'none',
                      }}
                    >
                      {totalQuantity}
                    </td>
                    <td
                      className="r mono"
                      style={{
                        color: 'var(--warn)',
                        fontWeight: 600,
                        borderTop: '2px solid var(--border-strong)',
                        borderBottom: 'none',
                      }}
                    >
                      {totalReserved}
                    </td>
                    <td
                      className="r mono"
                      style={{
                        fontWeight: 600,
                        borderTop: '2px solid var(--border-strong)',
                        borderBottom: 'none',
                      }}
                    >
                      {totalAvailable}
                    </td>
                    <td
                      style={{
                        borderTop: '2px solid var(--border-strong)',
                        borderBottom: 'none',
                      }}
                    />
                  </tr>
                </tfoot>
              </table>
            )}
          </Panel>

          <Panel title="Lëvizjet e fundit" padded={false}>
            {movements.length === 0 ? (
              <Empty icon="history" title="Asnjë lëvizje" subtitle="Lëvizjet e stokut do të shfaqen këtu." />
            ) : (
              <div className="col">
                {movements.map((m, i) => {
                  const store = Array.isArray(m.store) ? m.store[0] : m.store;
                  const iconName = MOVEMENT_ICON[m.reason] ?? 'history';
                  return (
                    <div
                      key={m.id}
                      className="row"
                      style={{
                        gap: 10,
                        padding: '8px 14px',
                        borderTop: i ? '1px solid var(--border-subtle)' : 'none',
                      }}
                    >
                      <Icon name={iconName as 'box'} size={13} />
                      <div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>
                        <div className="row" style={{ gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 500 }}>
                            {MOVEMENT_LABEL[m.reason] ?? m.reason}
                          </span>
                          {(store as { code: string } | null)?.code && (
                            <span className="mono meta" style={{ fontSize: 10 }}>
                              {(store as { code: string }).code}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className="mono"
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: (m.change ?? 0) > 0 ? 'var(--ok)' : 'var(--danger)',
                        }}
                      >
                        {(m.change ?? 0) > 0 ? '+' : ''}
                        {m.change ?? 0}
                      </span>
                      <span className="meta product-detail-movements-time" style={{ fontSize: 10, width: 90, textAlign: 'right', flexShrink: 0 }}>
                        {relativeTime(m.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
