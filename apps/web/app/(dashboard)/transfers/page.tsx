import Link from 'next/link';

import { Empty } from '@/components/ui/empty';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { StokuButton } from '@/components/ui/stoku-button';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { STATUS_LABEL } from './status';

export const metadata = { title: 'Trasferimenti — STOKU' };

type BadgeVariant = 'default' | 'ok' | 'warn' | 'danger' | 'info' | 'draft' | 'accent';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'draft',
  in_transit: 'accent',
  completed: 'ok',
  cancelled: 'danger',
};

type SearchParams = {
  status?: string;
  from?: string;
  to?: string;
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireSession();
  const params = await searchParams;
  const status = params.status ?? '';
  const fromFilter = params.from ? Number(params.from) : null;
  const toFilter = params.to ? Number(params.to) : null;

  const supabase = await createClient();

  let query = supabase
    .from('stock_transfers')
    .select(
      'id, transfer_number, status, created_at, shipped_at, received_at, notes, from_store:stores!stock_transfers_from_store_id_fkey(code, name), to_store:stores!stock_transfers_to_store_id_fkey(code, name)',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (status) query = query.eq('status', status);
  if (fromFilter) query = query.eq('from_store_id', fromFilter);
  if (toFilter) query = query.eq('to_store_id', toFilter);

  const [transfersRes, storesRes] = await Promise.all([
    query,
    supabase.from('stores').select('id, code, name').eq('is_active', true).order('code'),
  ]);

  const rows = transfersRes.data ?? [];
  const stores = storesRes.data ?? [];
  const activeFilters = (status ? 1 : 0) + (fromFilter ? 1 : 0) + (toFilter ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Trasferimenti"
        subtitle={
          rows.length > 0
            ? `${rows.length.toLocaleString('it-IT')} trasferimenti · ultimi 200`
            : 'Nessun trasferimento — crea il primo'
        }
        right={
          <Link href="/transfers/new">
            <StokuButton icon="plus" variant="primary">
              Nuovo trasferimento
            </StokuButton>
          </Link>
        }
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Panel padded>
          <form
            method="get"
            className="row"
            style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}
          >
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
                ORIGINE
              </span>
              <select
                name="from"
                defaultValue={fromFilter ? String(fromFilter) : ''}
                className="stoku-input"
                style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
              >
                <option value="">Tutte</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="col" style={{ gap: 4, width: 180 }}>
              <span className="meta" style={{ fontSize: 11 }}>
                DESTINAZIONE
              </span>
              <select
                name="to"
                defaultValue={toFilter ? String(toFilter) : ''}
                className="stoku-input"
                style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
              >
                <option value="">Tutte</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="row" style={{ gap: 6, marginLeft: 'auto' }}>
              <StokuButton type="submit" variant="primary" size="sm" icon="filter">
                Filtra
              </StokuButton>
              {activeFilters > 0 && (
                <Link href="/transfers" className="btn ghost sm">
                  Reset
                </Link>
              )}
            </div>
          </form>
        </Panel>

        <Panel padded={false}>
          {rows.length === 0 ? (
            <Empty
              icon="transfer"
              title={activeFilters > 0 ? 'Nessun trasferimento' : 'Nessun trasferimento ancora'}
              subtitle={
                activeFilters > 0
                  ? 'Prova a cambiare i filtri.'
                  : 'Crea un trasferimento per spostare stock tra PdV.'
              }
              action={
                activeFilters > 0 ? undefined : (
                  <Link href="/transfers/new">
                    <StokuButton icon="plus" variant="primary">
                      Nuovo trasferimento
                    </StokuButton>
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
                  <th style={{ width: 130 }}>Status</th>
                  <th>Origine → Destinazione</th>
                  <th style={{ width: 110 }}>Spedito</th>
                  <th style={{ width: 110 }}>Ricevuto</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDate(t.created_at)}</td>
                    <td className="mono" style={{ fontSize: 11, fontWeight: 500 }}>
                      <Link href={`/transfers/${t.id}`} style={{ color: 'inherit' }}>
                        {t.transfer_number}
                      </Link>
                    </td>
                    <td>
                      <StokuBadge variant={STATUS_VARIANT[t.status] ?? 'default'}>
                        {STATUS_LABEL[t.status] ?? t.status}
                      </StokuBadge>
                    </td>
                    <td className="truncate-1">
                      <span className="mono" style={{ fontSize: 11, fontWeight: 500 }}>
                        {t.from_store?.code ?? '—'}
                      </span>
                      {' → '}
                      <span className="mono" style={{ fontSize: 11, fontWeight: 500 }}>
                        {t.to_store?.code ?? '—'}
                      </span>
                      {t.notes && (
                        <span className="faint" style={{ fontSize: 11, marginLeft: 8 }}>
                          {t.notes}
                        </span>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {formatDate(t.shipped_at)}
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {formatDate(t.received_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}
