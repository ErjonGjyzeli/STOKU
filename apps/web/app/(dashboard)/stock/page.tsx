import Link from 'next/link';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { StokuButton } from '@/components/ui/stoku-button';
import { requireSession } from '@/lib/auth/session';
import { formatInt } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Magazzino — STOKU' };

const PAGE_SIZE = 50;

const KIND_LABEL: Record<string, string> = {
  open: 'Aperto',
  cabinet: 'Armadio',
  drawer: 'Cassettiera',
  floor: 'Pavimento',
};

type SearchParams = {
  q?: string;
  low?: string;
  page?: string;
};

function buildQuery(base: SearchParams, patch: Partial<SearchParams>) {
  const params = new URLSearchParams();
  const merged = { ...base, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const storeFilter = session.isExplicitAllScope ? null : session.activeStoreId;
  const lowOnly = params.low === '1';
  const page = Math.max(1, Number(params.page) || 1);

  const supabase = await createClient();

  let productIds: string[] | null = null;
  if (q) {
    const { data: matched } = await supabase
      .from('products')
      .select('id')
      .textSearch('search_vector', q, { type: 'websearch', config: 'simple' });
    productIds = (matched ?? [])
      .map((m) => m.id)
      .filter((id): id is string => !!id);
    if (productIds.length === 0) productIds = ['00000000-0000-0000-0000-000000000000'];
  }

  let stockQuery = supabase
    .from('stock')
    .select(
      'product_id, store_id, shelf_id, quantity, reserved_quantity, min_stock, location_code, last_counted_at, product:products(id, sku, name, legacy_nr, is_active), store:stores(id, code, name)',
      { count: 'exact' },
    )
    .order('store_id');

  if (storeFilter) stockQuery = stockQuery.eq('store_id', storeFilter);
  if (productIds) stockQuery = stockQuery.in('product_id', productIds);

  const fromIdx = (page - 1) * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;

  let shelvesQuery = supabase
    .from('shelves')
    .select('id, code, description, kind, capacity, is_active, store:stores(code)')
    .eq('is_active', true)
    .order('code');
  if (storeFilter) shelvesQuery = shelvesQuery.eq('store_id', storeFilter);

  const [stockRes, shelvesRes] = await Promise.all([
    stockQuery.range(fromIdx, toIdx),
    shelvesQuery,
  ]);

  if (stockRes.error) {
    return <p style={{ padding: 24, color: 'var(--danger)' }}>Errore: {stockRes.error.message}</p>;
  }

  let rows = stockRes.data ?? [];
  if (lowOnly) {
    rows = rows.filter((r) => r.quantity - r.reserved_quantity <= (r.min_stock ?? 0));
  }

  const shelves = shelvesRes.data ?? [];

  // Count prodotti per scaffale dai dati stock già caricati (pagina corrente)
  const shelfProductCount = new Map<string, number>();
  for (const r of stockRes.data ?? []) {
    if (r.shelf_id) {
      shelfProductCount.set(r.shelf_id, (shelfProductCount.get(r.shelf_id) ?? 0) + 1);
    }
  }

  const total = stockRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFilters = (q ? 1 : 0) + (lowOnly ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Magazzino"
        subtitle={
          total > 0
            ? `${formatInt(total)} righe stock · pagina ${page}/${totalPages}`
            : 'Nessuna giacenza — le righe appaiono dopo il primo movimento'
        }
        right={
          session.profile.role === 'admin' ? (
            <Link href="/settings/stores" className="btn ghost sm">
              <Icon name="store" size={12} /> Gestisci PdV
            </Link>
          ) : undefined
        }
      />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Filtri */}
        <Panel padded>
          <form
            method="get"
            className="row"
            style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}
          >
            <label className="col" style={{ gap: 4, flex: '1 1 260px' }}>
              <span className="meta" style={{ fontSize: 11 }}>
                CERCA PRODOTTO
              </span>
              <div className="stoku-input" style={{ height: 32 }}>
                <Icon name="search" size={13} />
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Nome, SKU, OEM, #ex-Excel"
                  autoComplete="off"
                />
              </div>
            </label>

            <label
              className="row"
              style={{ gap: 6, alignItems: 'center', height: 32, fontSize: 13 }}
            >
              <input type="checkbox" name="low" value="1" defaultChecked={lowOnly} />
              Solo sotto soglia
            </label>

            <div className="row" style={{ gap: 6, marginLeft: 'auto' }}>
              <StokuButton type="submit" variant="primary" size="sm" icon="filter">
                Filtra
              </StokuButton>
              {activeFilters > 0 && (
                <Link href="/stock" className="btn ghost sm">
                  Reset
                </Link>
              )}
            </div>
          </form>
        </Panel>

        {/* Scaffali + Stock */}
        <div className="grid-side">
          {/* Scaffali */}
          <Panel
            title={`Scaffali${shelves.length > 0 ? ` (${shelves.length})` : ''}`}
            padded={false}
            right={
              <Link href="/shelves" className="btn ghost sm">
                Gestisci
              </Link>
            }
          >
            {shelves.length === 0 ? (
              <Empty
                icon="shelves"
                title="Nessuno scaffale"
                subtitle="Crea scaffali da /shelves."
              />
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {shelves.map((s) => {
                  const count = shelfProductCount.get(s.id) ?? 0;
                  return (
                    <li
                      key={s.id}
                      style={{
                        borderBottom: '1px solid var(--stoku-border)',
                      }}
                    >
                      <Link
                        href={`/shelves/${s.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 12px',
                          color: 'inherit',
                          textDecoration: 'none',
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            flexShrink: 0,
                            background: 'var(--panel-sunken)',
                            border: '1px solid var(--stoku-border)',
                            borderRadius: 'var(--r-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--ink-3)',
                          }}
                        >
                          <Icon name="shelves" size={13} />
                        </div>
                        <div className="col stretch" style={{ gap: 0, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }} className="mono">
                            {s.code}
                          </div>
                          <div className="meta" style={{ fontSize: 10.5 }}>
                            {KIND_LABEL[s.kind] ?? s.kind}
                            {s.capacity != null && ` · cap. ${s.capacity}`}
                            {!storeFilter && s.store?.code && (
                              <span style={{ marginLeft: 4 }}>· {s.store.code}</span>
                            )}
                          </div>
                        </div>
                        {count > 0 && (
                          <span
                            className="mono"
                            style={{
                              fontSize: 11,
                              color: 'var(--ink-3)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {count} art.
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {/* Stock */}
          <Panel padded={false}>
            {rows.length === 0 ? (
              <Empty
                icon="building"
                title={activeFilters > 0 ? 'Nessun risultato' : 'Nessuna giacenza'}
                subtitle={
                  activeFilters > 0
                    ? 'Prova a resettare i filtri.'
                    : 'Le righe stock compaiono al primo carico o movimento.'
                }
              />
            ) : (
              <div className="panel-scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 90 }}>Store</th>
                      <th style={{ width: 110 }}>SKU</th>
                      <th>Prodotto</th>
                      <th style={{ width: 70, textAlign: 'right' }}>Qta</th>
                      <th style={{ width: 80, textAlign: 'right' }}>Prenot.</th>
                      <th style={{ width: 70, textAlign: 'right' }}>Disp.</th>
                      <th style={{ width: 70, textAlign: 'right' }}>Soglia</th>
                      <th style={{ width: 100 }}>Posizione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const available = r.quantity - r.reserved_quantity;
                      const underLow = available <= (r.min_stock ?? 0);
                      return (
                        <tr key={`${r.product_id}-${r.store_id}`}>
                          <td className="mono" style={{ fontSize: 11, fontWeight: 500 }}>
                            {r.store?.code ?? <span className="faint">—</span>}
                          </td>
                          <td className="mono" style={{ fontSize: 11 }}>
                            <Link
                              href={`/products?q=${encodeURIComponent(r.product?.sku ?? '')}`}
                              style={{ color: 'inherit' }}
                            >
                              {r.product?.sku ?? '—'}
                            </Link>
                          </td>
                          <td className="truncate-1">
                            {r.product?.name ?? <span className="faint">—</span>}
                            {r.product?.legacy_nr && (
                              <span className="faint mono" style={{ marginLeft: 8, fontSize: 11 }}>
                                #{r.product.legacy_nr}
                              </span>
                            )}
                            {r.product?.is_active === false && (
                              <StokuBadge variant="draft" style={{ marginLeft: 8 }}>
                                Disattivato
                              </StokuBadge>
                            )}
                          </td>
                          <td className="mono" style={{ textAlign: 'right' }}>
                            {r.quantity}
                          </td>
                          <td className="mono" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>
                            {r.reserved_quantity > 0 ? r.reserved_quantity : '—'}
                          </td>
                          <td
                            className="mono"
                            style={{
                              textAlign: 'right',
                              fontWeight: 500,
                              color: underLow ? 'var(--warn)' : undefined,
                            }}
                          >
                            {available}
                          </td>
                          <td className="mono" style={{ textAlign: 'right' }}>
                            {r.min_stock ?? <span className="faint">0</span>}
                          </td>
                          <td className="mono" style={{ fontSize: 11 }}>
                            {r.location_code ?? <span className="faint">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div
                className="row"
                style={{ justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px' }}
              >
                <div className="meta" style={{ fontSize: 12 }}>
                  Pagina {page} di {totalPages}
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {page > 1 ? (
                    <Link
                      href={`/stock${buildQuery(params, { page: String(page - 1) })}`}
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
                      href={`/stock${buildQuery(params, { page: String(page + 1) })}`}
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
          </Panel>
        </div>
      </div>
    </div>
  );
}
