import Link from 'next/link';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { StokuButton } from '@/components/ui/stoku-button';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

type BadgeVariant = 'default' | 'ok' | 'warn' | 'danger' | 'info' | 'draft' | 'accent';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Bozza',
  confirmed: 'Confermato',
  paid: 'Pagato',
  shipped: 'Spedito',
  completed: 'Completato',
  cancelled: 'Annullato',
};

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'draft',
  confirmed: 'info',
  paid: 'info',
  shipped: 'accent',
  completed: 'ok',
  cancelled: 'danger',
};

const REVENUE_STATUSES = ['confirmed', 'paid', 'shipped', 'completed'];

function currency(value: number | null, code: string | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: code ?? 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function relativeTime(iso: string | null) {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'adesso';
  if (minutes < 60) return `${minutes} min fa`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ieri';
  if (days < 7) return `${days} giorni fa`;
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

const REASON_LABEL: Record<string, string> = {
  sale: 'ha venduto',
  return: 'ha registrato un reso di',
  adjustment: 'ha rettificato',
  intake: 'ha caricato',
  damage: 'ha registrato perdita di',
  transfer_out: 'ha spedito in transito',
  transfer_in: 'ha ricevuto',
  reservation: 'ha prenotato',
  unreservation: 'ha rilasciato prenotazione di',
};

const REASON_ICON: Record<string, string> = {
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

export default async function HomePage() {
  const session = await requireSession();
  const firstName = session.profile.full_name?.split(' ')[0] ?? '';
  const greet = firstName ? `Benvenuto, ${firstName}` : 'Benvenuto';
  const todayLabel = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const supabase = await createClient();

  // Boundaries temporali
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const monthStart = new Date(now);
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const todayIso = todayStart.toISOString();
  const monthIso = monthStart.toISOString();

  // Scope: se l'utente ha un PdV attivo (non ha scelto scope globale),
  // tutte le KPI + liste si restringono a quel PdV.
  const scopeStoreId = session.isExplicitAllScope ? null : session.activeStoreId;

  const todayOrdersQuery = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayIso);
  const mtdOrdersQuery = supabase
    .from('orders')
    .select('total')
    .in('status', REVENUE_STATUSES)
    .gte('created_at', monthIso);
  const productsActiveQuery = supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);
  const transfersOpenQuery = supabase
    .from('stock_transfers')
    .select(
      'id, transfer_number, status, shipped_at, from_store:stores!stock_transfers_from_store_id_fkey(code), to_store:stores!stock_transfers_to_store_id_fkey(code)',
    )
    .in('status', ['draft', 'in_transit'])
    .order('created_at', { ascending: false })
    .limit(5);
  const recentOrdersQuery = supabase
    .from('orders')
    .select(
      'id, order_number, status, total, currency, created_at, customer:customers(code, name), store:stores(code)',
    )
    .order('created_at', { ascending: false })
    .limit(8);

  if (scopeStoreId) {
    todayOrdersQuery.eq('store_id', scopeStoreId);
    mtdOrdersQuery.eq('store_id', scopeStoreId);
    transfersOpenQuery.or(
      `from_store_id.eq.${scopeStoreId},to_store_id.eq.${scopeStoreId}`,
    );
    recentOrdersQuery.eq('store_id', scopeStoreId);
  }

  const [todayOrdersRes, mtdOrdersRes, productsActiveRes, transfersOpenRes, recentOrdersRes] =
    await Promise.all([
      todayOrdersQuery,
      mtdOrdersQuery,
      productsActiveQuery,
      transfersOpenQuery,
      recentOrdersQuery,
    ]);

  const ordersToday = todayOrdersRes.count ?? 0;
  const mtdTotal = (mtdOrdersRes.data ?? []).reduce(
    (sum, o) => sum + Number(o.total ?? 0),
    0,
  );
  const productsActive = productsActiveRes.count ?? 0;
  const openTransfers = transfersOpenRes.data ?? [];
  const recentOrders = recentOrdersRes.data ?? [];

  // Stock basso + totale pezzi: fetch stock + aggrega in memoria. Limit
  // alto per coprire dataset attuale (~5.5k righe per PV) + headroom.
  // Bug precedente: limit 2000 tagliava sum totale (mostrava 2851 vs 16408).
  // Oltre i 20k rows servirà aggregato server (RPC) o paginazione.
  const stockQuery = supabase
    .from('stock')
    .select(
      'product_id, store_id, quantity, reserved_quantity, min_stock, store:stores(code), product:products(sku, name)',
    )
    .limit(20000);
  if (scopeStoreId) stockQuery.eq('store_id', scopeStoreId);
  const { data: stockRows } = await stockQuery;
  const lowStock = (stockRows ?? []).filter(
    (r) => r.quantity - r.reserved_quantity <= (r.min_stock ?? 0),
  );
  const lowStockCount = lowStock.length;
  const lowStockTop = lowStock.slice(0, 6);
  const totalUnits = (stockRows ?? []).reduce((sum, r) => sum + Number(r.quantity ?? 0), 0);

  // Activity feed: ultimi 10 movimenti stock (vendite, carichi, transfer, etc)
  const activityQuery = supabase
    .from('inventory_movements')
    .select(
      'id, created_at, reason, change, product:products(sku, name), store:stores!inventory_movements_store_id_fkey(code), staff:staff_profiles(full_name)',
    )
    .order('created_at', { ascending: false })
    .limit(10);
  if (scopeStoreId) activityQuery.eq('store_id', scopeStoreId);
  const { data: activityRows } = await activityQuery;

  return (
    <div>
      <PageHeader
        title={greet}
        subtitle={todayLabel}
        right={
          <>
            <Link href="/orders/new">
              <StokuButton icon="plus" variant="primary">
                Nuovo ordine
              </StokuButton>
            </Link>
          </>
        }
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="grid-kpi-4">
          <Stat label="Ordini oggi" value={ordersToday.toLocaleString('it-IT')} />
          <Stat label="Fatturato MTD" value={currency(mtdTotal, 'EUR')} />
          <Stat
            label="Stock basso"
            value={lowStockCount.toLocaleString('it-IT')}
            warn={lowStockCount > 0}
            link="/stock?low=1"
          />
          <Stat
            label="Prodotti attivi"
            value={productsActive.toLocaleString('it-IT')}
            hint={`${totalUnits.toLocaleString('it-IT')} pezzi totali`}
            link="/products"
          />
        </div>

        <div className="grid-main-aside">
          <Panel
            title={`Ordini recenti (${recentOrders.length})`}
            padded={false}
            right={
              <Link href="/orders" className="btn ghost sm">
                Tutti
              </Link>
            }
          >
            {recentOrders.length === 0 ? (
              <Empty
                icon="cart"
                title="Nessun ordine ancora"
                subtitle="Crea la prima bozza da /orders/new."
              />
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 120 }}>Numero</th>
                    <th>Cliente</th>
                    <th style={{ width: 70 }}>Store</th>
                    <th style={{ width: 120 }}>Status</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Totale</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="mono" style={{ fontSize: 11, fontWeight: 500 }}>
                        <Link href={`/orders/${o.id}`} style={{ color: 'inherit' }}>
                          {o.order_number}
                        </Link>
                      </td>
                      <td className="truncate-1">
                        {o.customer ? (
                          o.customer.name
                        ) : (
                          <span className="faint">Vendita banco</span>
                        )}
                      </td>
                      <td className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                        {o.store?.code ?? <span className="faint">—</span>}
                      </td>
                      <td>
                        <StokuBadge variant={STATUS_VARIANT[o.status] ?? 'default'}>
                          {STATUS_LABEL[o.status] ?? o.status}
                        </StokuBadge>
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {currency(Number(o.total), o.currency)}
                      </td>
                      <td
                        className="meta"
                        style={{ textAlign: 'right', fontSize: 12 }}
                      >
                        {relativeTime(o.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <div className="col" style={{ gap: 16 }}>
            <Panel
              title={`Stock basso${lowStockCount > 0 ? ` (${lowStockCount})` : ''}`}
              padded={false}
              right={
                lowStockCount > 0 ? (
                  <Link href="/stock?low=1" className="btn ghost sm">
                    <Icon name="alert" size={11} /> Tutti
                  </Link>
                ) : undefined
              }
            >
              {lowStockTop.length === 0 ? (
                <Empty
                  icon="box"
                  title="Tutto sopra soglia"
                  subtitle="Le righe con disp. ≤ soglia appaiono qui."
                />
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {lowStockTop.map((r) => {
                    const available = r.quantity - r.reserved_quantity;
                    const outOfStock = available <= 0;
                    return (
                      <li
                        key={`${r.product_id}-${r.store_id}`}
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid var(--stoku-border)',
                        }}
                      >
                        <div className="row" style={{ gap: 8 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              flexShrink: 0,
                              background: 'var(--panel-sunken)',
                              border: '1px solid var(--stoku-border)',
                              borderRadius: 'var(--r-sm)',
                              backgroundImage: `repeating-linear-gradient(45deg, oklch(0.88 0.005 80) 0 4px, oklch(0.94 0.004 80) 4px 8px)`,
                            }}
                          />
                          <div className="col stretch" style={{ gap: 0, minWidth: 0 }}>
                            <div
                              className="truncate-1"
                              style={{ fontSize: 12, fontWeight: 500 }}
                            >
                              {r.product?.name ?? '—'}
                            </div>
                            <div className="mono meta" style={{ fontSize: 10.5 }}>
                              {r.product?.sku ?? '—'} · {r.store?.code ?? '—'}
                            </div>
                          </div>
                          <span
                            className="mono"
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: outOfStock ? 'var(--danger)' : 'var(--warn)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {available}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel
              title={`Trasferimenti aperti${openTransfers.length > 0 ? ` (${openTransfers.length})` : ''}`}
              padded={false}
              right={
                openTransfers.length > 0 ? (
                  <Link href="/transfers" className="btn ghost sm">
                    Tutti
                  </Link>
                ) : undefined
              }
            >
              {openTransfers.length === 0 ? (
                <Empty
                  icon="transfer"
                  title="Nessun trasferimento in corso"
                  subtitle="Crea da /transfers/new."
                />
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {openTransfers.map((t) => (
                    <li
                      key={t.id}
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--stoku-border)',
                        fontSize: 12,
                      }}
                    >
                      <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
                        <Link
                          href={`/transfers/${t.id}`}
                          className="mono"
                          style={{ fontSize: 11, fontWeight: 500, color: 'inherit' }}
                        >
                          {t.transfer_number}
                        </Link>
                        <StokuBadge variant={t.status === 'in_transit' ? 'accent' : 'draft'}>
                          {STATUS_LABEL_TRANSFER[t.status] ?? t.status}
                        </StokuBadge>
                      </div>
                      <div className="meta" style={{ fontSize: 10, marginTop: 2 }}>
                        {t.from_store?.code ?? '—'} → {t.to_store?.code ?? '—'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        {(activityRows ?? []).length > 0 && (
          <Panel title="Attività recente" padded={false}>
            <div className="col" style={{ gap: 0 }}>
              {(activityRows ?? []).map((a, i) => {
                const who = a.staff?.full_name ?? 'Sistema';
                const action = REASON_LABEL[a.reason] ?? a.reason;
                const target = a.product
                  ? `${a.product.sku}${a.change != null ? ` (${a.change > 0 ? '+' : ''}${a.change})` : ''}`
                  : '—';
                const iconName = REASON_ICON[a.reason] ?? 'history';
                return (
                  <div
                    key={a.id}
                    className="row"
                    style={{
                      gap: 12,
                      padding: '10px 16px',
                      borderTop: i ? '1px solid var(--stoku-border)' : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'var(--panel-2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--ink-3)',
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={iconName as 'box'} size={12} />
                    </div>
                    <div
                      className="row"
                      style={{ gap: 4, fontSize: 13, flex: 1, minWidth: 0, flexWrap: 'wrap' }}
                    >
                      <span style={{ fontWeight: 500 }}>{who}</span>
                      <span className="dim">{action}</span>
                      <span className="mono" style={{ fontSize: 12 }}>
                        {target}
                      </span>
                      {a.store?.code && (
                        <span className="meta" style={{ fontSize: 11 }}>
                          · {a.store.code}
                        </span>
                      )}
                    </div>
                    <span className="meta" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {relativeTime(a.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

const STATUS_LABEL_TRANSFER: Record<string, string> = {
  draft: 'Bozza',
  in_transit: 'In transito',
  completed: 'Completato',
  cancelled: 'Annullato',
};

function Stat({
  label,
  value,
  hint,
  warn,
  link,
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
  link?: string;
}) {
  const inner = (
    <div
      style={{
        padding: '14px 16px',
        background: 'var(--panel)',
        border: '1px solid var(--stoku-border)',
        borderRadius: 'var(--r-lg)',
        height: '100%',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </div>
      <div
        className="mono"
        style={{
          marginTop: 6,
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: warn ? 'var(--warn)' : undefined,
        }}
      >
        {value}
      </div>
      {hint && (
        <div
          className="mono"
          style={{ marginTop: 2, fontSize: 11, color: 'var(--ink-3)' }}
        >
          {hint}
        </div>
      )}
    </div>
  );
  return link ? (
    <Link href={link} style={{ textDecoration: 'none', color: 'inherit' }}>
      {inner}
    </Link>
  ) : (
    inner
  );
}
