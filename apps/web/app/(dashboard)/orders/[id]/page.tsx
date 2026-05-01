import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { requireSession } from '@/lib/auth/session';
import { formatDateTimeLong } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import {
  OrderDetailClient,
  type OrderItemRow,
  type OrderSummary,
  type ProductOption,
} from './order-detail-client';

export const metadata = { title: 'Ordine — STOKU' };

function formatDate(iso: string | null) {
  if (!iso) return null;
  return formatDateTimeLong(iso);
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, customer_id, store_id, notes, subtotal, tax_rate, tax_amount, discount_amount, total, currency, created_at, confirmed_at, completed_at, customer:customers(id, code, name, type), store:stores(id, code, name)',
    )
    .eq('id', id)
    .single();
  if (error || !order) notFound();

  const { data: itemsRaw } = await supabase
    .from('order_items')
    .select('id, product_id, product_sku_snapshot, product_name_snapshot, quantity, unit_price, line_total')
    .eq('order_id', id)
    .order('id');

  const items: OrderItemRow[] = (itemsRaw ?? []).map((r) => ({
    id: r.id,
    product_id: r.product_id,
    product_sku_snapshot: r.product_sku_snapshot,
    product_name_snapshot: r.product_name_snapshot,
    quantity: r.quantity,
    unit_price: Number(r.unit_price),
    line_total: r.line_total != null ? Number(r.line_total) : null,
  }));

  // Picker prodotti: parte dallo stock del PV dell'ordine, non da products.
  // Una sola query con join, già scopata al PV → max ~N righe (prodotti con
  // stock in quel PV) anziché 500 prodotti + 500 UUID in URL .in() che
  // sforava il limite PostgREST e tornava vuoto (tutti "Esaurito").
  // available = quantity - reserved_quantity (stessa logica del trigger
  // reserve_stock / funzione get_available).
  const { data: stockRows } = await supabase
    .from('stock')
    .select(
      'quantity, reserved_quantity, product:products!inner(id, sku, name, price_sell, currency, is_active)',
    )
    .eq('store_id', order.store_id)
    .eq('product.is_active', true)
    .order('name', { foreignTable: 'products', ascending: true })
    .limit(500);
  const products: ProductOption[] = (stockRows ?? [])
    .filter((r) => r.product)
    .map((r) => {
      const p = r.product!;
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        price_sell: p.price_sell != null ? Number(p.price_sell) : null,
        currency: p.currency,
        available: Number(r.quantity ?? 0) - Number(r.reserved_quantity ?? 0),
      };
    });

  const summary: OrderSummary = {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    subtotal: Number(order.subtotal),
    tax_rate: order.tax_rate != null ? Number(order.tax_rate) : null,
    tax_amount: Number(order.tax_amount),
    discount_amount: order.discount_amount != null ? Number(order.discount_amount) : null,
    total: Number(order.total),
    currency: order.currency,
  };

  const customerLabel = order.customer
    ? `${order.customer.code ? `${order.customer.code} · ` : ''}${order.customer.name}`
    : 'Vendita banco';

  return (
    <div>
      <PageHeader
        title={`Ordine ${order.order_number}`}
        subtitle={`${customerLabel} · ${order.store?.code ?? ''} ${order.store?.name ?? ''}`}
        breadcrumb={[
          { label: 'Ordini' },
          { label: order.order_number },
        ]}
        right={
          <Link href="/orders" className="btn ghost sm">
            Torna agli ordini
          </Link>
        }
      />
      <div className="grid-side" style={{ padding: 24 }}>
        <div className="col" style={{ gap: 16 }}>
          <Panel title="Dettagli">
            <dl className="col" style={{ gap: 8, margin: 0, fontSize: 13 }}>
              <Detail label="Cliente" value={customerLabel} />
              <Detail
                label="Punto vendita"
                value={
                  order.store ? `${order.store.code} · ${order.store.name}` : '—'
                }
              />
              <Detail label="Creato" value={formatDate(order.created_at) ?? '—'} />
              {order.confirmed_at && (
                <Detail
                  label="Confermato"
                  value={formatDate(order.confirmed_at) ?? '—'}
                />
              )}
              {order.completed_at && (
                <Detail
                  label="Completato"
                  value={formatDate(order.completed_at) ?? '—'}
                />
              )}
              {order.notes && <Detail label="Note" value={order.notes} />}
            </dl>
          </Panel>
        </div>

        <OrderDetailClient order={summary} items={items} products={products} />
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="col" style={{ gap: 2 }}>
      <dt
        className="meta"
        style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}
      >
        {label}
      </dt>
      <dd style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{value}</dd>
    </div>
  );
}
