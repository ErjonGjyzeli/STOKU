import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
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

// Status che contano come "ordine acquisito" ai fini del totale speso.
// draft + cancelled esclusi.
const REVENUE_STATUSES = new Set(['confirmed', 'paid', 'shipped', 'completed']);

function currency(value: number | null, code: string | null) {
  if (value == null) return null;
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: code ?? 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer, error } = await supabase
    .from('customers')
    .select(
      'id, code, type, name, vat_number, tax_code, email, phone, address_line1, city, postal_code, country, notes, created_at',
    )
    .eq('id', id)
    .single();
  if (error || !customer) notFound();

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, total, currency, created_at, completed_at')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })
    .limit(100);

  const allOrders = orders ?? [];
  const countOrders = allOrders.length;
  const totalSpent = allOrders.reduce(
    (sum, o) => (REVENUE_STATUSES.has(o.status) ? sum + Number(o.total ?? 0) : sum),
    0,
  );
  const lastOrder = allOrders[0] ?? null;

  const infoEntries: Array<[string, string | null]> = [
    ['Code', customer.code],
    ['Tipo', customer.type === 'business' ? 'Azienda' : 'Privato'],
    ['NIPT / P.IVA', customer.vat_number],
    ['Codice fiscale', customer.tax_code],
    ['Email', customer.email],
    ['Telefono', customer.phone],
    [
      'Indirizzo',
      [customer.address_line1, customer.postal_code, customer.city, customer.country]
        .filter(Boolean)
        .join(', ') || null,
    ],
    ['Creato', formatDate(customer.created_at)],
  ];

  return (
    <div>
      <PageHeader
        title={customer.name}
        subtitle={customer.code ? `${customer.code} · ${infoEntries[1][1]}` : infoEntries[1][1]!}
        breadcrumb={[{ label: 'Clienti' }, { label: customer.name }]}
        right={
          <Link href="/customers" className="btn ghost sm">
            Torna alla lista
          </Link>
        }
      />
      <div
        style={{
          padding: 24,
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'minmax(280px, 360px) 1fr',
        }}
      >
        <div className="col" style={{ gap: 16 }}>
          <Panel title="Anagrafica">
            <dl className="col" style={{ gap: 8, margin: 0 }}>
              {infoEntries.map(([label, value]) => (
                <div key={label} className="col" style={{ gap: 2 }}>
                  <dt
                    className="meta"
                    style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  >
                    {label}
                  </dt>
                  <dd style={{ margin: 0, fontSize: 13 }}>
                    {value ?? <span className="faint">—</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          {customer.notes && (
            <Panel title="Note">
              <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', margin: 0 }}>{customer.notes}</p>
            </Panel>
          )}
        </div>

        <div className="col" style={{ gap: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            }}
          >
            <Stat label="Ordini totali" value={countOrders.toString()} />
            <Stat
              label="Totale speso"
              value={
                countOrders === 0 ? '—' : (currency(totalSpent, lastOrder?.currency ?? 'EUR') ?? '—')
              }
              hint="Escluso bozze/annullati"
            />
            <Stat
              label="Ultimo ordine"
              value={lastOrder ? (formatDate(lastOrder.created_at) ?? '—') : '—'}
              hint={lastOrder ? `Status: ${STATUS_LABEL[lastOrder.status] ?? lastOrder.status}` : undefined}
            />
          </div>

          <Panel title={`Cronologia ordini (${countOrders})`} padded={false}>
            {allOrders.length === 0 ? (
              <Empty
                icon="cart"
                title="Nessun ordine ancora"
                subtitle="Gli ordini appariranno qui dalla Fase 5 in poi."
              />
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 120 }}>Data</th>
                    <th style={{ width: 160 }}>Numero</th>
                    <th style={{ width: 140 }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {allOrders.map((o) => (
                    <tr key={o.id}>
                      <td>{formatDate(o.created_at)}</td>
                      <td className="mono" style={{ fontSize: 11, fontWeight: 500 }}>
                        {o.order_number}
                      </td>
                      <td>
                        <StokuBadge variant={STATUS_VARIANT[o.status] ?? 'default'}>
                          {STATUS_LABEL[o.status] ?? o.status}
                        </StokuBadge>
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {currency(o.total, o.currency) ?? <span className="faint">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
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
        style={{ marginTop: 6, fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}
      >
        {value}
      </div>
      {hint && (
        <div className="meta" style={{ fontSize: 11, marginTop: 2 }}>
          <Icon name="info" size={10} /> {hint}
        </div>
      )}
    </div>
  );
}
