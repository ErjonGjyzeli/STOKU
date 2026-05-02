import Link from 'next/link';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { requireSession } from '@/lib/auth/session';
import {
  formatCurrency,
  formatDate as fmtDate,
  formatDateTime as fmtDateTime,
} from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import {
  fetchInventory,
  fetchMovements,
  fetchSales,
  type ReportTab,
} from './queries';

export const metadata = { title: 'Raporte — STOKU' };

type BadgeVariant = 'default' | 'ok' | 'warn' | 'danger' | 'info' | 'draft' | 'accent';

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Konfirmuar',
  paid: 'Paguar',
  shipped: 'Dërguar',
  completed: 'Kompletuar',
};
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  confirmed: 'info',
  paid: 'info',
  shipped: 'accent',
  completed: 'ok',
};

const REASON_LABEL: Record<string, string> = {
  sale: 'Shitje',
  return: 'Kthim',
  adjustment: 'Rregullim',
  intake: 'Ngarkim',
  damage: 'Dëm/humbje',
  transfer_out: 'Dalje transf.',
  transfer_in: 'Hyrje transf.',
  reservation: 'Rezervim',
  unreservation: 'Çlirim',
};

type SearchParams = {
  tab?: string;
  from?: string;
  to?: string;
  store?: string;
};

function resolveTab(raw: string | undefined): ReportTab {
  if (raw === 'inventory') return 'inventory';
  if (raw === 'movements') return 'movements';
  return 'sales';
}

function currency(value: number | null, code: string | null) {
  return formatCurrency(value, code);
}

function formatDate(iso: string | null) {
  return fmtDate(iso);
}

function formatDateTime(iso: string | null) {
  return fmtDateTime(iso, { shortYear: true });
}

function buildQuery(base: SearchParams, patch: Partial<SearchParams>) {
  const p = new URLSearchParams();
  const merged = { ...base, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const tab = resolveTab(params.tab);
  const from = params.from || null;
  const to = params.to || null;
  const storeId =
    params.store !== undefined
      ? params.store
        ? Number(params.store)
        : null
      : session.isExplicitAllScope
        ? null
        : session.activeStoreId;

  const supabase = await createClient();
  const { data: stores } = await supabase
    .from('stores')
    .select('id, code, name')
    .eq('is_active', true)
    .order('code');

  const filters = { tab, from, to, store: storeId };

  const [salesRows, inventoryRows, movementRows] = await Promise.all([
    tab === 'sales' ? fetchSales(filters) : Promise.resolve([]),
    tab === 'inventory' ? fetchInventory(filters) : Promise.resolve([]),
    tab === 'movements' ? fetchMovements(filters) : Promise.resolve([]),
  ]);

  const exportBase = buildQuery(params, { tab });
  const csvHref = `/reports/export${exportBase}${exportBase.includes('?') ? '&' : '?'}format=csv`;
  const xlsxHref = `/reports/export${exportBase}${exportBase.includes('?') ? '&' : '?'}format=xlsx`;

  const totalSales =
    tab === 'sales' ? salesRows.reduce((sum, r) => sum + r.total, 0) : 0;

  return (
    <div>
      <PageHeader
        title="Raporte"
        subtitle="Eksporto për kontabilitet, vendime, auditim"
        right={
          <form method="get" className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input type="hidden" name="tab" value={tab} />
            {storeId && <input type="hidden" name="store" value={String(storeId)} />}
            {tab !== 'inventory' && (
              <>
                <div className="stoku-input" style={{ height: 28, width: 130 }}>
                  <Icon name="clock" size={11} />
                  <input type="date" name="from" defaultValue={from ?? ''} />
                </div>
                <span className="meta" style={{ fontSize: 11 }}>→</span>
                <div className="stoku-input" style={{ height: 28, width: 130 }}>
                  <Icon name="clock" size={11} />
                  <input type="date" name="to" defaultValue={to ?? ''} />
                </div>
              </>
            )}
            <button type="submit" className="btn ghost sm">
              <Icon name="filter" size={12} /> Apliko
            </button>
            <a href={csvHref} className="btn ghost sm" target="_blank" rel="noopener noreferrer">
              <Icon name="download" size={12} /> CSV
            </a>
          </form>
        }
      />

      <div style={{ padding: '0 24px', borderBottom: '1px solid var(--stoku-border)' }}>
        <div className="row" style={{ gap: 0 }}>
          <TabLink current={tab} label="Shitje" target="sales" icon="cart" params={params} />
          <TabLink current={tab} label="Inventar" target="inventory" icon="box" params={params} />
          <TabLink current={tab} label="Lëvizje" target="movements" icon="history" params={params} />
        </div>
      </div>

      <div className="page-body" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {tab === 'sales' && (
          <Panel
            title={`Shitje (${salesRows.length}) — totali ${currency(totalSales, salesRows[0]?.currency ?? 'EUR')}`}
            padded={false}
          >
            {salesRows.length === 0 ? (
              <Empty icon="cart" title="Asnjë porosi" subtitle="Filtrat nuk kthejnë asnjë rresht." />
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 100 }}>Data</th>
                    <th style={{ width: 120 }}>Nr.</th>
                    <th>Klienti</th>
                    <th style={{ width: 80 }}>PV</th>
                    <th style={{ width: 120 }}>Status</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Nëntotali</th>
                    <th style={{ width: 110, textAlign: 'right' }}>TVSH</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Totali</th>
                  </tr>
                </thead>
                <tbody>
                  {salesRows.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDate(r.created_at)}</td>
                      <td className="mono" style={{ fontSize: 10 }}>
                        <Link href={`/orders/${r.id}`} style={{ color: 'inherit' }}>
                          {r.order_number}
                        </Link>
                      </td>
                      <td className="truncate-1">
                        {r.customer_name ?? <span className="faint">Shitje banaku</span>}
                      </td>
                      <td className="mono" style={{ fontSize: 10 }}>
                        {r.store_code ?? <span className="faint">—</span>}
                      </td>
                      <td>
                        <StokuBadge variant={STATUS_VARIANT[r.status] ?? 'default'}>
                          {STATUS_LABEL[r.status] ?? r.status}
                        </StokuBadge>
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {currency(r.subtotal, r.currency)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {currency(r.tax_amount, r.currency)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 500 }}>
                        {currency(r.total, r.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        )}

        {tab === 'inventory' && (
          <Panel title={`Inventar (${inventoryRows.length} rreshta)`} padded={false}>
            {inventoryRows.length === 0 ? (
              <Empty icon="building" title="Asnjë gjendje stoku" />
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>PV</th>
                    <th style={{ width: 120 }}>SKU</th>
                    <th>Emri</th>
                    <th style={{ width: 80, textAlign: 'right' }}>Sasi</th>
                    <th style={{ width: 80, textAlign: 'right' }}>Rezerv.</th>
                    <th style={{ width: 80, textAlign: 'right' }}>Disp.</th>
                    <th style={{ width: 80, textAlign: 'right' }}>Kuota</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryRows.map((r) => (
                    <tr key={`${r.product_id}-${r.store_id}`}>
                      <td className="mono" style={{ fontSize: 10 }}>
                        {r.store_code ?? '—'}
                      </td>
                      <td className="mono" style={{ fontSize: 10 }}>
                        {r.sku}
                      </td>
                      <td className="truncate-1">{r.name}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {r.quantity}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>
                        {r.reserved_quantity || '—'}
                      </td>
                      <td
                        className="mono"
                        style={{
                          textAlign: 'right',
                          fontWeight: 500,
                          color:
                            r.available <= (r.min_stock ?? 0) ? 'var(--warn)' : undefined,
                        }}
                      >
                        {r.available}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {r.min_stock ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        )}

        {tab === 'movements' && (
          <Panel title={`Lëvizje (${movementRows.length})`} padded={false}>
            {movementRows.length === 0 ? (
              <Empty icon="history" title="Asnjë lëvizje" />
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 130 }}>Kur</th>
                    <th style={{ width: 130 }}>Arsyeja</th>
                    <th style={{ width: 120 }}>SKU</th>
                    <th>Produkti</th>
                    <th style={{ width: 80 }}>PV</th>
                    <th style={{ width: 80, textAlign: 'right' }}>Delta</th>
                    <th style={{ width: 140 }}>Referenca</th>
                  </tr>
                </thead>
                <tbody>
                  {movementRows.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontSize: 10 }}>{formatDateTime(r.created_at)}</td>
                      <td>
                        <StokuBadge
                          variant={r.change < 0 ? 'danger' : r.change > 0 ? 'ok' : 'default'}
                        >
                          {REASON_LABEL[r.reason] ?? r.reason}
                        </StokuBadge>
                      </td>
                      <td className="mono" style={{ fontSize: 10 }}>
                        {r.sku ?? '—'}
                      </td>
                      <td className="truncate-1">{r.product_name ?? '—'}</td>
                      <td className="mono" style={{ fontSize: 10 }}>
                        {r.store_code ?? '—'}
                      </td>
                      <td
                        className="mono"
                        style={{
                          textAlign: 'right',
                          fontWeight: 500,
                          color:
                            r.change < 0
                              ? 'var(--danger)'
                              : r.change > 0
                                ? 'var(--ok)'
                                : undefined,
                        }}
                      >
                        {r.change > 0 ? `+${r.change}` : r.change}
                      </td>
                      <td className="mono" style={{ fontSize: 10 }}>
                        {r.reference_order_number ?? r.transfer_number ?? (
                          <span className="faint">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}

function TabLink({
  current,
  label,
  target,
  icon,
  params,
}: {
  current: ReportTab;
  label: string;
  target: ReportTab;
  icon?: string;
  params: SearchParams;
}) {
  const active = current === target;
  const href = `/reports${buildQuery(params, { tab: target })}`;
  return (
    <Link
      href={href}
      className="row"
      style={{
        gap: 6,
        padding: '10px 14px',
        fontSize: 11,
        color: active ? 'var(--ink-1)' : 'var(--ink-3)',
        fontWeight: active ? 600 : 400,
        borderBottom: active ? '2px solid var(--stoku-accent)' : '2px solid transparent',
        marginBottom: -1,
        textDecoration: 'none',
      }}
    >
      {label}
    </Link>
  );
}
