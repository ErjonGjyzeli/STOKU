import Link from 'next/link';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { StokuButton } from '@/components/ui/stoku-button';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { OrderCreateButton } from './order-create-button';
import { STATUS_LABEL } from './status';

export const metadata = { title: 'Ordini — STOKU' };

const PAGE_SIZE = 25;

type BadgeVariant = 'default' | 'ok' | 'warn' | 'danger' | 'info' | 'draft' | 'accent';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'draft',
  confirmed: 'info',
  paid: 'info',
  shipped: 'accent',
  completed: 'ok',
  cancelled: 'danger',
};

const REVENUE_STATUSES = ['confirmed', 'paid', 'shipped', 'completed'];

type SearchParams = {
  q?: string;
  status?: string;
  store?: string;
  customer?: string;
  from?: string;
  to?: string;
  page?: string;
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function currency(value: number | null, code: string | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: code ?? 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value));
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

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const status = params.status ?? '';
  // Scope store: URL esplicito ha priorità, poi activeStoreId della session
  // (a meno che l'utente abbia scelto scope globale "Tutti i magazzini").
  const storeId =
    params.store !== undefined
      ? params.store
        ? Number(params.store)
        : null
      : session.isExplicitAllScope
        ? null
        : session.activeStoreId;
  const customerId = params.customer || null;
  const from = params.from || null;
  const to = params.to || null;
  const page = Math.max(1, Number(params.page) || 1);

  const supabase = await createClient();

  // Stat tiles: 4 count/sum separati (lightweight, 4 round-trip ma
  // rapidi grazie all'index orders_status_idx).
  const nowMonthStart = new Date();
  nowMonthStart.setUTCDate(1);
  nowMonthStart.setUTCHours(0, 0, 0, 0);
  const mtdIso = nowMonthStart.toISOString();

  // I tile rispettano lo scope store corrente: se l'utente ha selezionato
  // un PdV singolo la KPI bar si restringe, altrimenti conta global.
  const openTiles = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .in('status', ['confirmed', 'paid', 'shipped']);
  const draftTiles = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'draft');
  const mtdTiles = supabase
    .from('orders')
    .select('total, currency')
    .in('status', REVENUE_STATUSES)
    .gte('created_at', mtdIso);
  const todayTiles = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')
    .gte('completed_at', new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString());

  if (storeId) {
    openTiles.eq('store_id', storeId);
    draftTiles.eq('store_id', storeId);
    mtdTiles.eq('store_id', storeId);
    todayTiles.eq('store_id', storeId);
  }

  const [openCountRes, draftCountRes, mtdRes, todayRes] = await Promise.all([
    openTiles,
    draftTiles,
    mtdTiles,
    todayTiles,
  ]);

  const openCount = openCountRes.count ?? 0;
  const draftCount = draftCountRes.count ?? 0;
  const completedToday = todayRes.count ?? 0;
  const mtdTotal = (mtdRes.data ?? []).reduce((sum, o) => sum + Number(o.total ?? 0), 0);

  // Filtri stores per select (visibili all'utente via RLS) + customers
  // per il form di creazione ordine nella modal.
  const [storesRes, customersRes] = await Promise.all([
    supabase.from('stores').select('id, code, name').eq('is_active', true).order('code'),
    supabase.from('customers').select('id, code, name').order('name').limit(500),
  ]);
  const stores = storesRes.data;
  const customers = customersRes.data ?? [];

  // Query principale
  let query = supabase
    .from('orders')
    .select(
      'id, order_number, status, total, currency, created_at, customer:customers(code, name), store:stores(code)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (q) query = query.ilike('order_number', `%${q}%`);
  if (status) query = query.eq('status', status);
  if (storeId) query = query.eq('store_id', storeId);
  if (customerId) query = query.eq('customer_id', customerId);
  if (from) query = query.gte('created_at', from);
  if (to) {
    // to inclusivo: aggiungiamo 1 giorno
    const toDate = new Date(to);
    toDate.setUTCDate(toDate.getUTCDate() + 1);
    query = query.lt('created_at', toDate.toISOString().slice(0, 10));
  }

  const fromIdx = (page - 1) * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;
  const { data: orders, count, error } = await query.range(fromIdx, toIdx);

  if (error) {
    return <p style={{ padding: 24, color: 'var(--danger)' }}>Errore: {error.message}</p>;
  }

  const rows = orders ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFilters =
    (q ? 1 : 0) +
    (status ? 1 : 0) +
    (storeId ? 1 : 0) +
    (customerId ? 1 : 0) +
    (from ? 1 : 0) +
    (to ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Ordini"
        subtitle={
          total > 0
            ? `${total.toLocaleString('it-IT')} ordini · pagina ${page}/${totalPages}`
            : 'Nessun ordine ancora — crea la prima bozza'
        }
        right={
          <OrderCreateButton
            customers={customers}
            stores={stores ?? []}
            defaultStoreId={session.activeStoreId}
          />
        }
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
          }}
        >
          <Stat
            label="Ordini aperti"
            value={openCount.toLocaleString('it-IT')}
            hint="confermati · pagati · spediti"
          />
          <Stat
            label="Da confermare"
            value={draftCount.toLocaleString('it-IT')}
            hint="bozze prenotate"
          />
          <Stat
            label="Fatturato MTD"
            value={currency(mtdTotal, 'EUR')}
            hint="dal 1° del mese"
          />
          <Stat
            label="Completati oggi"
            value={completedToday.toLocaleString('it-IT')}
            hint="consegne chiuse"
          />
        </div>

        <Panel padded>
          <form
            method="get"
            className="row"
            style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}
          >
            <label className="col" style={{ gap: 4, flex: '1 1 200px' }}>
              <span className="meta" style={{ fontSize: 11 }}>
                NUMERO
              </span>
              <div className="stoku-input" style={{ height: 32 }}>
                <Icon name="search" size={13} />
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="O-000001"
                  autoComplete="off"
                />
              </div>
            </label>

            <label className="col" style={{ gap: 4, width: 150 }}>
              <span className="meta" style={{ fontSize: 11 }}>
                STATUS
              </span>
              <select
                name="status"
                defaultValue={status}
                className="stoku-input"
                style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
              >
                <option value="">Tutti</option>
                {Object.entries(STATUS_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="col" style={{ gap: 4, width: 180 }}>
              <span className="meta" style={{ fontSize: 11 }}>
                STORE
              </span>
              <select
                name="store"
                defaultValue={storeId ? String(storeId) : ''}
                className="stoku-input"
                style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
              >
                <option value="">Tutti</option>
                {(stores ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="col" style={{ gap: 4, width: 130 }}>
              <span className="meta" style={{ fontSize: 11 }}>
                DA
              </span>
              <input
                type="date"
                name="from"
                defaultValue={from ?? ''}
                className="stoku-input"
                style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
              />
            </label>

            <label className="col" style={{ gap: 4, width: 130 }}>
              <span className="meta" style={{ fontSize: 11 }}>
                A
              </span>
              <input
                type="date"
                name="to"
                defaultValue={to ?? ''}
                className="stoku-input"
                style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
              />
            </label>

            <div className="row" style={{ gap: 6, marginLeft: 'auto' }}>
              <StokuButton type="submit" variant="primary" size="sm" icon="filter">
                Filtra
              </StokuButton>
              {activeFilters > 0 && (
                <Link href="/orders" className="btn ghost sm">
                  Reset
                </Link>
              )}
            </div>
          </form>
        </Panel>

        <Panel padded={false}>
          {rows.length === 0 ? (
            <Empty
              icon="cart"
              title={activeFilters > 0 ? 'Nessun ordine trovato' : 'Nessun ordine'}
              subtitle={
                activeFilters > 0
                  ? 'Prova a modificare o resettare i filtri.'
                  : 'Crea una bozza per iniziare a prenotare stock.'
              }
              action={
                activeFilters > 0 ? undefined : (
                  <Link href="/orders?new=1" className="btn primary">
                    <Icon name="plus" size={12} />
                    Nuovo ordine
                  </Link>
                )
              }
            />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Data</th>
                  <th style={{ width: 130 }}>Numero</th>
                  <th style={{ width: 140 }}>Status</th>
                  <th>Cliente</th>
                  <th style={{ width: 80 }}>Store</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Totale</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td>{formatDate(o.created_at)}</td>
                    <td className="mono" style={{ fontWeight: 500, fontSize: 11 }}>
                      <Link href={`/orders/${o.id}`} style={{ color: 'inherit' }}>
                        {o.order_number}
                      </Link>
                    </td>
                    <td>
                      <StokuBadge variant={STATUS_VARIANT[o.status] ?? 'default'}>
                        {STATUS_LABEL[o.status] ?? o.status}
                      </StokuBadge>
                    </td>
                    <td className="truncate-1">
                      {o.customer ? (
                        `${o.customer.code ? `${o.customer.code} · ` : ''}${o.customer.name}`
                      ) : (
                        <span className="faint">Vendita banco</span>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {o.store?.code ?? <span className="faint">—</span>}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {currency(Number(o.total), o.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        {totalPages > 1 && (
          <div
            className="row"
            style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
          >
            <div className="meta" style={{ fontSize: 12 }}>
              Pagina {page} di {totalPages}
            </div>
            <div className="row" style={{ gap: 6 }}>
              {page > 1 ? (
                <Link
                  href={`/orders${buildQuery(params, { page: String(page - 1) })}`}
                  className="btn ghost sm"
                >
                  <Icon name="chevronLeft" size={12} /> Precedente
                </Link>
              ) : (
                <span className="btn ghost sm" aria-disabled="true" style={{ opacity: 0.4 }}>
                  <Icon name="chevronLeft" size={12} /> Precedente
                </span>
              )}
              {page < totalPages ? (
                <Link
                  href={`/orders${buildQuery(params, { page: String(page + 1) })}`}
                  className="btn ghost sm"
                >
                  Successiva <Icon name="chevronRight" size={12} />
                </Link>
              ) : (
                <span className="btn ghost sm" aria-disabled="true" style={{ opacity: 0.4 }}>
                  Successiva <Icon name="chevronRight" size={12} />
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        background: 'var(--panel)',
        border: '1px solid var(--stoku-border)',
        borderRadius: 'var(--r-lg)',
      }}
    >
      <div
        className="meta"
        style={{
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>
      <div
        className="mono"
        style={{ marginTop: 6, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}
      >
        {value}
      </div>
      {hint && (
        <div className="meta" style={{ fontSize: 11, marginTop: 2 }}>
          {hint}
        </div>
      )}
    </div>
  );
}
