import Link from 'next/link';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { requireSession } from '@/lib/auth/session';
import { formatCurrency, formatInt } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { OrderCreateButton } from './order-create-button';
import { STATUS_LABEL } from './status';

export const metadata = { title: 'Ordini — STOKU' };

const PAGE_SIZE = 50;

type BadgeVariant = 'default' | 'ok' | 'warn' | 'danger' | 'info' | 'draft' | 'accent';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'draft',
  confirmed: 'info',
  paid: 'info',
  shipped: 'accent',
  completed: 'ok',
  cancelled: 'danger',
};

type SearchParams = {
  q?: string;
  status?: string;
  page?: string;
};

function currency(value: number | null, code: string | null) {
  return formatCurrency(value, code);
}

function buildQuery(base: SearchParams, patch: Partial<SearchParams>) {
  const params = new URLSearchParams();
  const merged = { ...base, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

const TABS = [
  { value: '', label: 'Tutti' },
  { value: 'draft', label: 'Bozza' },
  { value: 'confirmed', label: 'Confermati' },
  { value: 'completed', label: 'Completati' },
  { value: 'cancelled', label: 'Annullati' },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const status = params.status ?? '';
  const page = Math.max(1, Number(params.page) || 1);

  const storeId = session.isExplicitAllScope ? null : session.activeStoreId;

  const supabase = await createClient();

  const [storesRes, customersRes] = await Promise.all([
    supabase.from('stores').select('id, code, name').eq('is_active', true).order('code'),
    supabase.from('customers').select('id, code, name').order('name').limit(500),
  ]);
  const stores = storesRes.data;
  const customers = customersRes.data ?? [];

  // Count per tab
  const countOrders = (statusFilter?: string | string[]) => {
    let q = supabase.from('orders').select('id', { count: 'exact', head: true });
    if (Array.isArray(statusFilter)) q = q.in('status', statusFilter);
    else if (statusFilter) q = q.eq('status', statusFilter);
    if (storeId) q = q.eq('store_id', storeId);
    return q;
  };

  const [totalRes, draftRes, confirmedRes, completedRes, cancelledRes] = await Promise.all([
    countOrders(),
    countOrders('draft'),
    countOrders(['confirmed', 'paid', 'shipped']),
    countOrders('completed'),
    countOrders('cancelled'),
  ]);

  const tabCounts: Record<string, number> = {
    '': totalRes.count ?? 0,
    draft: draftRes.count ?? 0,
    confirmed: confirmedRes.count ?? 0,
    completed: completedRes.count ?? 0,
    cancelled: cancelledRes.count ?? 0,
  };

  let query = supabase
    .from('orders')
    .select(
      'id, order_number, status, total, subtotal, currency, created_at, customer:customers(code, name), store:stores(code)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (q) query = query.ilike('order_number', `%${q}%`);
  if (status) {
    if (status === 'confirmed') query = query.in('status', ['confirmed', 'paid', 'shipped']);
    else query = query.eq('status', status);
  }
  if (storeId) query = query.eq('store_id', storeId);

  const fromIdx = (page - 1) * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;
  const { data: orders, count, error } = await query.range(fromIdx, toIdx);

  if (error) {
    return <p style={{ padding: 24, color: 'var(--danger)' }}>Errore: {error.message}</p>;
  }

  const rows = orders ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Ordini"
        subtitle={`${formatInt(tabCounts[''])} ordini totali`}
        right={
          <OrderCreateButton
            customers={customers}
            stores={stores ?? []}
            defaultStoreId={session.activeStoreId}
          />
        }
      />

      {/* Tab bar + search */}
      <div
        style={{
          padding: '0 24px',
          borderBottom: '1px solid var(--stoku-border)',
          display: 'flex',
          gap: 0,
          alignItems: 'center',
        }}
      >
        <div className="row" style={{ gap: 0, flex: 1 }}>
          {TABS.map((t) => {
            const active = status === t.value;
            const count = tabCounts[t.value] ?? 0;
            const href = `/orders${buildQuery(params, { status: t.value, page: undefined })}`;
            return (
              <Link
                key={t.value}
                href={href}
                style={{
                  padding: '10px 14px',
                  fontSize: 11,
                  color: active ? 'var(--ink-1)' : 'var(--ink-3)',
                  fontWeight: active ? 600 : 400,
                  borderBottom: active ? '2px solid var(--stoku-accent)' : '2px solid transparent',
                  marginBottom: -1,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
                {count > 0 && (
                  <span className="mono" style={{ fontSize: 10, marginLeft: 5, color: active ? 'var(--ink-3)' : 'var(--ink-4)' }}>
                    {formatInt(count)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        <form method="get" style={{ display: 'flex', alignItems: 'center' }}>
          {status && <input type="hidden" name="status" value={status} />}
          <div className="stoku-input" style={{ width: 260, height: 28 }}>
            <Icon name="search" size={13} />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Cerca…"
              autoComplete="off"
            />
          </div>
        </form>
      </div>

      <div className="page-body" style={{ padding: 24 }}>
        <Panel padded={false}>
          {rows.length === 0 ? (
            <Empty
              icon="cart"
              title={q || status ? 'Nessun ordine trovato' : 'Nessun ordine'}
              subtitle={
                q || status
                  ? 'Prova a cambiare i filtri.'
                  : 'Crea una bozza per iniziare.'
              }
            />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Numero</th>
                  <th>Cliente</th>
                  <th style={{ width: 80 }}>Punto</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th className="r" style={{ width: 110 }}>Subtotale</th>
                  <th className="r" style={{ width: 110 }}>Totale</th>
                  <th style={{ width: 120 }}>Creato</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/orders/${o.id}`} style={{ color: 'inherit' }}>
                        <span className="mono" style={{ fontSize: 11, fontWeight: 500 }}>{o.order_number}</span>
                      </Link>
                    </td>
                    <td className="truncate-1">
                      {o.customer ? (
                        `${o.customer.code ? `${o.customer.code} · ` : ''}${o.customer.name}`
                      ) : (
                        <span className="faint">Vendita banco</span>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 10 }}>
                      {o.store?.code ?? <span className="faint">—</span>}
                    </td>
                    <td>
                      <StokuBadge variant={STATUS_VARIANT[o.status] ?? 'default'}>
                        {STATUS_LABEL[o.status] ?? o.status}
                      </StokuBadge>
                    </td>
                    <td className="mono r">
                      {currency(Number(o.subtotal), o.currency)}
                    </td>
                    <td className="mono r" style={{ fontWeight: 600 }}>
                      {currency(Number(o.total), o.currency)}
                    </td>
                    <td className="meta" style={{ fontSize: 11 }}>
                      {relativeDate(o.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        {totalPages > 1 && (
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <div className="meta" style={{ fontSize: 11 }}>Pagina {page} di {totalPages}</div>
            <div className="row" style={{ gap: 6 }}>
              {page > 1 ? (
                <Link href={`/orders${buildQuery(params, { page: String(page - 1) })}`} className="btn ghost sm">
                  <Icon name="chevronLeft" size={12} /> Precedente
                </Link>
              ) : (
                <span className="btn ghost sm" style={{ opacity: 0.4 }}><Icon name="chevronLeft" size={12} /> Precedente</span>
              )}
              {page < totalPages ? (
                <Link href={`/orders${buildQuery(params, { page: String(page + 1) })}`} className="btn ghost sm">
                  Successiva <Icon name="chevronRight" size={12} />
                </Link>
              ) : (
                <span className="btn ghost sm" style={{ opacity: 0.4 }}>Successiva <Icon name="chevronRight" size={12} /></span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function relativeDate(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'oggi';
  if (days === 1) return 'ieri';
  if (days < 30) return `${days}g fa`;
  if (days < 365) return `${Math.floor(days / 30)}m fa`;
  return `${Math.floor(days / 365)}a fa`;
}
