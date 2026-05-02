import Link from 'next/link';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { requireSession } from '@/lib/auth/session';
import { formatInt } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { STATUS_LABEL } from './status';
import { TransferCreateButton } from './transfer-create-button';

export const metadata = { title: 'Trasferimenti — STOKU' };

type BadgeVariant = 'default' | 'ok' | 'warn' | 'danger' | 'info' | 'draft' | 'accent';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'draft',
  in_transit: 'accent',
  completed: 'ok',
  cancelled: 'danger',
};

type SearchParams = { status?: string };

const TABS = [
  { value: '', label: 'Tutti' },
  { value: 'draft', label: 'Bozza' },
  { value: 'in_transit', label: 'In transit' },
  { value: 'completed', label: 'Completati' },
  { value: 'cancelled', label: 'Annullati' },
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

function relativeDate(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'oggi';
  if (days === 1) return 'ieri';
  if (days < 30) return `${days}g fa`;
  return `${Math.floor(days / 30)}m fa`;
}

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const status = params.status ?? '';

  const scopeStoreId = session.isExplicitAllScope ? null : session.activeStoreId;

  const supabase = await createClient();

  // Count per tab
  const countTransfers = (statusFilter?: string) => {
    let q = supabase.from('stock_transfers').select('id', { count: 'exact', head: true });
    if (statusFilter) q = q.eq('status', statusFilter);
    if (scopeStoreId) q = q.or(`from_store_id.eq.${scopeStoreId},to_store_id.eq.${scopeStoreId}`);
    return q;
  };

  const [totalRes, draftRes, transitRes, completedRes, cancelledRes] = await Promise.all([
    countTransfers(),
    countTransfers('draft'),
    countTransfers('in_transit'),
    countTransfers('completed'),
    countTransfers('cancelled'),
  ]);

  const tabCounts: Record<string, number> = {
    '': totalRes.count ?? 0,
    draft: draftRes.count ?? 0,
    in_transit: transitRes.count ?? 0,
    completed: completedRes.count ?? 0,
    cancelled: cancelledRes.count ?? 0,
  };

  let query = supabase
    .from('stock_transfers')
    .select(
      'id, transfer_number, status, created_at, shipped_at, received_at, notes, from_store:stores!stock_transfers_from_store_id_fkey(code, name), to_store:stores!stock_transfers_to_store_id_fkey(code, name)',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (status) query = query.eq('status', status);
  if (scopeStoreId) {
    query = query.or(`from_store_id.eq.${scopeStoreId},to_store_id.eq.${scopeStoreId}`);
  }

  const [transfersRes, storesRes] = await Promise.all([
    query,
    supabase.from('stores').select('id, code, name').eq('is_active', true).order('code'),
  ]);

  const rows = transfersRes.data ?? [];
  const stores = storesRes.data ?? [];

  return (
    <div>
      <PageHeader
        title="Trasferimenti"
        subtitle={`Spostamenti stock tra punti vendita · ${formatInt(tabCounts[''])} totali`}
        right={<TransferCreateButton stores={stores} defaultFromStoreId={session.activeStoreId} />}
      />

      {/* Tab bar */}
      <div
        style={{
          padding: '0 24px',
          borderBottom: '1px solid var(--stoku-border)',
          display: 'flex',
          gap: 0,
          alignItems: 'center',
        }}
      >
        {TABS.map((t) => {
          const active = status === t.value;
          const cnt = tabCounts[t.value] ?? 0;
          return (
            <Link
              key={t.value}
              href={`/transfers${buildQuery(params, { status: t.value })}`}
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
              {cnt > 0 && (
                <span className="mono" style={{ fontSize: 10, marginLeft: 5, color: active ? 'var(--ink-3)' : 'var(--ink-4)' }}>
                  {cnt}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="page-body" style={{ padding: 24 }}>
        <Panel padded={false}>
          {rows.length === 0 ? (
            <Empty
              icon="transfer"
              title={status ? 'Nessun trasferimento' : 'Nessun trasferimento ancora'}
              subtitle={
                status
                  ? 'Prova a cambiare tab.'
                  : 'Crea un trasferimento per spostare stock tra PdV.'
              }
              action={
                !status ? (
                  <Link href="/transfers?new=1" className="btn primary">
                    <Icon name="plus" size={12} />
                    Nuovo trasferimento
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Numero</th>
                  <th>Origine → Destinazione</th>
                  <th style={{ width: 130 }}>Status</th>
                  <th style={{ width: 110 }}>Spedito</th>
                  <th style={{ width: 110 }}>Ricevuto</th>
                  <th style={{ width: 100 }}>Creato</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/transfers/${t.id}`} style={{ color: 'inherit' }}>
                        <span className="mono" style={{ fontSize: 11, fontWeight: 500 }}>{t.transfer_number}</span>
                      </Link>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <span className="mono" style={{ fontWeight: 500 }}>{t.from_store?.code ?? '—'}</span>
                        <span className="meta">{t.from_store?.name}</span>
                        <Icon name="chevronRight" size={11} />
                        <span className="mono" style={{ fontWeight: 500 }}>{t.to_store?.code ?? '—'}</span>
                        <span className="meta">{t.to_store?.name}</span>
                      </div>
                      {t.notes && (
                        <div className="faint" style={{ fontSize: 10 }}>{t.notes}</div>
                      )}
                    </td>
                    <td>
                      <StokuBadge variant={STATUS_VARIANT[t.status] ?? 'default'}>
                        {STATUS_LABEL[t.status] ?? t.status}
                      </StokuBadge>
                    </td>
                    <td className="meta" style={{ fontSize: 11 }}>
                      {relativeDate(t.shipped_at)}
                    </td>
                    <td className="meta" style={{ fontSize: 11 }}>
                      {relativeDate(t.received_at)}
                    </td>
                    <td className="meta" style={{ fontSize: 11 }}>
                      {relativeDate(t.created_at)}
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
