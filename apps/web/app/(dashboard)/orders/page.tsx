import Link from 'next/link';

import { Empty } from '@/components/ui/empty';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { StokuButton } from '@/components/ui/stoku-button';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Ordini — STOKU' };

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

export default async function OrdersPage() {
  await requireSession();
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, total, currency, created_at, customer:customers(code, name), store:stores(code)',
    )
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = orders ?? [];

  return (
    <div>
      <PageHeader
        title="Ordini"
        subtitle={
          rows.length > 0
            ? `${rows.length.toLocaleString('it-IT')} ordini · ultimi 100`
            : 'Nessun ordine ancora — crea la prima bozza'
        }
        right={
          <Link href="/orders/new">
            <StokuButton icon="plus" variant="primary">
              Nuovo ordine
            </StokuButton>
          </Link>
        }
      />

      <div style={{ padding: 24 }}>
        <Panel padded={false}>
          {rows.length === 0 ? (
            <Empty
              icon="cart"
              title="Nessun ordine"
              subtitle="Crea una bozza per iniziare a prenotare stock."
              action={
                <Link href="/orders/new">
                  <StokuButton icon="plus" variant="primary">
                    Nuovo ordine
                  </StokuButton>
                </Link>
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
      </div>
    </div>
  );
}
