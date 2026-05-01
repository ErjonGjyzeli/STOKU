import Link from 'next/link';

import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuButton } from '@/components/ui/stoku-button';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { ShelfCreateButton } from './shelf-create-button';
import { ShelvesClient, type ShelfRow } from './shelves-client';

export const metadata = { title: 'Scaffali — STOKU' };

const PAGE_SIZE = 50;

type SearchParams = {
  q?: string;
  kind?: string;
  inactive?: string;
  page?: string;
};

const KIND_OPTIONS: Array<{ value: ShelfRow['kind']; label: string }> = [
  { value: 'open', label: 'Aperto' },
  { value: 'cabinet', label: 'Armadio' },
  { value: 'drawer', label: 'Cassettiera' },
  { value: 'floor', label: 'Pavimento' },
];

function buildQuery(base: SearchParams, patch: Partial<SearchParams>) {
  const params = new URLSearchParams();
  const merged = { ...base, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export default async function ShelvesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const kindFilter = (params.kind ?? '').trim();
  const showInactive = params.inactive === '1';
  const page = Math.max(1, Number(params.page) || 1);

  const role = session.profile.role;
  const canWrite = role === 'admin' || role === 'warehouse';
  const isAllScope = session.activeStoreId === null;
  const showStoreColumn = isAllScope;
  const storeLabel = isAllScope
    ? 'Tutti i PV'
    : (session.stores.find((s) => s.id === session.activeStoreId)?.name ?? 'PV attivo');

  const supabase = await createClient();

  const storesRes = await supabase
    .from('stores')
    .select('id, code, name')
    .eq('is_active', true)
    .order('code');
  const stores = storesRes.data ?? [];

  // Lista scaffali. RLS già scoping ai PV accessibili: nello scope "tutti"
  // mostriamo tutto il visibile, altrimenti restringiamo al PV attivo.
  let query = supabase
    .from('shelves')
    .select(
      'id, code, description, kind, capacity, is_active, store_id, store:stores(id, code, name)',
      { count: 'exact' },
    )
    .order('code', { ascending: true });

  if (!isAllScope && session.activeStoreId !== null) {
    query = query.eq('store_id', session.activeStoreId);
  }
  if (q) {
    const escaped = q.replace(/[%,]/g, '');
    query = query.or(`code.ilike.%${escaped}%,description.ilike.%${escaped}%`);
  }
  if (kindFilter) query = query.eq('kind', kindFilter);
  if (!showInactive) query = query.eq('is_active', true);

  const fromIdx = (page - 1) * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;

  const shelvesRes = await query.range(fromIdx, toIdx);
  if (shelvesRes.error) {
    return (
      <p style={{ padding: 24, color: 'var(--danger)' }}>Errore: {shelvesRes.error.message}</p>
    );
  }
  const shelvesRaw = shelvesRes.data ?? [];

  // Aggregazione conteggi: PostgREST non fa GROUP BY, fetch stock degli
  // scaffali della pagina e raggruppo in JS (prodotti unici, pezzi totali).
  const shelfIds = shelvesRaw.map((s) => s.id);
  const counts = new Map<string, { uniqueProducts: number; totalPieces: number }>();
  if (shelfIds.length > 0) {
    const { data: stockRows } = await supabase
      .from('stock')
      .select('shelf_id, product_id, quantity')
      .in('shelf_id', shelfIds);
    const productsByShelf = new Map<string, Set<string>>();
    for (const row of stockRows ?? []) {
      if (!row.shelf_id) continue;
      const set = productsByShelf.get(row.shelf_id) ?? new Set<string>();
      set.add(row.product_id);
      productsByShelf.set(row.shelf_id, set);
      const c = counts.get(row.shelf_id) ?? { uniqueProducts: 0, totalPieces: 0 };
      c.totalPieces += row.quantity ?? 0;
      counts.set(row.shelf_id, c);
    }
    for (const [shelfId, set] of productsByShelf) {
      const c = counts.get(shelfId) ?? { uniqueProducts: 0, totalPieces: 0 };
      c.uniqueProducts = set.size;
      counts.set(shelfId, c);
    }
  }

  const shelves: ShelfRow[] = shelvesRaw.map((s) => {
    const c = counts.get(s.id) ?? { uniqueProducts: 0, totalPieces: 0 };
    return {
      id: s.id,
      code: s.code,
      description: s.description,
      kind: s.kind as ShelfRow['kind'],
      capacity: s.capacity,
      is_active: s.is_active,
      store_id: s.store_id,
      store_code: s.store?.code ?? null,
      store_name: s.store?.name ?? null,
      unique_products: c.uniqueProducts,
      total_pieces: c.totalPieces,
    };
  });

  const total = shelvesRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFilters = (q ? 1 : 0) + (kindFilter ? 1 : 0) + (showInactive ? 1 : 0);

  return (
    <div>
      <PageHeader
        title={`Scaffali — ${storeLabel}`}
        subtitle={
          total > 0
            ? `${total.toLocaleString('it-IT')} scaffali · mappa fisica del PV`
            : 'Nessuno scaffale ancora — crea il primo per iniziare'
        }
        right={
          canWrite ? (
            <ShelfCreateButton stores={stores} defaultStoreId={session.activeStoreId} />
          ) : undefined
        }
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Panel padded>
          <form
            method="get"
            className="row"
            style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}
          >
            <label className="col" style={{ gap: 4, flex: '1 1 260px' }}>
              <span className="meta" style={{ fontSize: 11 }}>
                CERCA
              </span>
              <div className="stoku-input" style={{ height: 32 }}>
                <Icon name="search" size={13} />
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Codice o descrizione"
                  autoComplete="off"
                />
              </div>
            </label>

            <label className="col" style={{ gap: 4, width: 160 }}>
              <span className="meta" style={{ fontSize: 11 }}>
                TIPO
              </span>
              <select
                name="kind"
                defaultValue={kindFilter}
                className="stoku-input"
                style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
              >
                <option value="">Tutti</option>
                {KIND_OPTIONS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>

            <label
              className="row"
              style={{ gap: 6, alignItems: 'center', height: 32, fontSize: 13 }}
            >
              <input type="checkbox" name="inactive" value="1" defaultChecked={showInactive} />
              Mostra disattivati
            </label>

            <div className="row" style={{ gap: 6, marginLeft: 'auto' }}>
              <StokuButton type="submit" variant="primary" size="sm" icon="filter">
                Filtra
              </StokuButton>
              {activeFilters > 0 && (
                <Link href="/shelves" className="btn ghost sm">
                  Reset
                </Link>
              )}
            </div>
          </form>
        </Panel>

        <ShelvesClient
          shelves={shelves}
          showStoreColumn={showStoreColumn}
          hasFilters={activeFilters > 0}
          stores={stores}
          defaultStoreId={session.activeStoreId}
          canWrite={canWrite}
        />

        {totalPages > 1 && (
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="meta" style={{ fontSize: 12 }}>
              Pagina {page} di {totalPages}
            </div>
            <div className="row" style={{ gap: 6 }}>
              {page > 1 ? (
                <Link
                  href={`/shelves${buildQuery(params, { page: String(page - 1) })}`}
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
                  href={`/shelves${buildQuery(params, { page: String(page + 1) })}`}
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
