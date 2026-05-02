import Link from 'next/link';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { requireSession } from '@/lib/auth/session';
import { formatDateLong } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Inventario fisico — STOKU' };

// Spec §3.8: lista scaffali ordinati per ultima conta (i meno recenti in cima),
// così il magazziniere sa quali scaffali contare prima.

function formatDate(iso: string | null) {
  if (!iso) return null;
  return formatDateLong(iso);
}

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86_400_000);
}

export default async function InventoryListPage() {
  const session = await requireSession();
  const isAllScope = session.activeStoreId === null;
  const storeLabel = isAllScope
    ? 'Tutti i PV'
    : (session.stores.find((s) => s.id === session.activeStoreId)?.name ?? 'PV attivo');

  const supabase = await createClient();

  // Scaffali attivi del PV; per ognuno l'ultima conta è il MAX(last_counted_at)
  // sulle righe stock (un'unica riga per shelf+product, ma più prodotti per
  // shelf — la "data ultima conta dello scaffale" = max delle sue righe).
  let shelvesQuery = supabase
    .from('shelves')
    .select('id, code, description, kind, store_id, store:stores(code, name)')
    .eq('is_active', true)
    .order('code');
  if (!isAllScope && session.activeStoreId !== null) {
    shelvesQuery = shelvesQuery.eq('store_id', session.activeStoreId);
  }

  const { data: shelves, error } = await shelvesQuery;
  if (error) {
    return <p style={{ padding: 24, color: 'var(--danger)' }}>Errore: {error.message}</p>;
  }

  const list = shelves ?? [];
  const lastCountedByShelf = new Map<string, string | null>();
  const productCountByShelf = new Map<string, number>();
  if (list.length > 0) {
    const { data: stockRows } = await supabase
      .from('stock')
      .select('shelf_id, last_counted_at')
      .in(
        'shelf_id',
        list.map((s) => s.id),
      );
    for (const row of stockRows ?? []) {
      if (!row.shelf_id) continue;
      productCountByShelf.set(
        row.shelf_id,
        (productCountByShelf.get(row.shelf_id) ?? 0) + 1,
      );
      // NULL su anche solo una riga = scaffale "mai contato per intero".
      // Sticky: se null è già stato visto, resta null indipendentemente
      // dall'ordine di iterazione.
      const prev = lastCountedByShelf.get(row.shelf_id);
      if (row.last_counted_at == null) {
        lastCountedByShelf.set(row.shelf_id, null);
      } else if (prev === undefined) {
        lastCountedByShelf.set(row.shelf_id, row.last_counted_at);
      } else if (prev !== null && row.last_counted_at > prev) {
        lastCountedByShelf.set(row.shelf_id, row.last_counted_at);
      }
    }
  }

  // Ordina: mai contati in cima, poi i più vecchi.
  const sorted = [...list].sort((a, b) => {
    const la = lastCountedByShelf.get(a.id);
    const lb = lastCountedByShelf.get(b.id);
    const aNever = la === null || la === undefined;
    const bNever = lb === null || lb === undefined;
    if (aNever && !bNever) return -1;
    if (!aNever && bNever) return 1;
    if (aNever && bNever) return a.code.localeCompare(b.code);
    return (la as string).localeCompare(lb as string);
  });

  return (
    <div>
      <PageHeader
        title={`Inventario fisico — ${storeLabel}`}
        subtitle="Scaffali ordinati per ultima conta (i meno recenti in cima)"
      />

      <div style={{ padding: 24 }}>
        {sorted.length === 0 ? (
          <Panel padded={false}>
            <Empty
              icon="check"
              title="Nessuno scaffale"
              subtitle="Crea uno scaffale per iniziare l'inventario fisico."
            />
          </Panel>
        ) : (
          <Panel padded={false}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 160 }}>Scaffale</th>
                  {isAllScope && <th style={{ width: 100 }}>PV</th>}
                  <th>Descrizione</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Prodotti</th>
                  <th style={{ width: 160 }}>Ultima conta</th>
                  <th style={{ width: 100 }} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => {
                  const last = lastCountedByShelf.get(s.id) ?? null;
                  const days = daysAgo(last);
                  const products = productCountByShelf.get(s.id) ?? 0;
                  const stale = days === null || days > 90;
                  return (
                    <tr key={s.id}>
                      <td className="mono" style={{ fontWeight: 500 }}>
                        <Link href={`/shelves/${s.id}`} style={{ color: 'inherit' }}>
                          {s.code}
                        </Link>
                      </td>
                      {isAllScope && (
                        <td className="mono" style={{ fontSize: 10 }}>
                          {s.store?.code ?? '—'}
                        </td>
                      )}
                      <td className="truncate-1">
                        {s.description || <span className="faint">—</span>}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {products}
                      </td>
                      <td>
                        {last ? (
                          <span className="row" style={{ gap: 6, alignItems: 'center' }}>
                            <span>{formatDate(last)}</span>
                            {stale && (
                              <StokuBadge variant="warn">
                                {days} gg fa
                              </StokuBadge>
                            )}
                          </span>
                        ) : (
                          <StokuBadge variant="danger">Mai contato</StokuBadge>
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/shelves/${s.id}/inventory`}
                          className="btn ghost sm"
                          aria-label={`Inventario ${s.code}`}
                        >
                          <Icon name="check" size={12} /> Conta
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        )}
      </div>
    </div>
  );
}
