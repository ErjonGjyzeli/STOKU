import { createClient } from '@/lib/supabase/server';

export type ReportTab = 'sales' | 'inventory' | 'movements';

const REVENUE_STATUSES = ['confirmed', 'paid', 'shipped', 'completed'];
const ROW_LIMIT = 2000; // cap per tenere i report gestibili — export > 2k passa via backoffice

export type ReportFilters = {
  tab: ReportTab;
  from: string | null;
  to: string | null;
  store: number | null;
};

export type SalesRow = {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  customer_name: string | null;
  store_code: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  currency: string | null;
};

export type InventoryRow = {
  product_id: string;
  store_id: number;
  sku: string;
  name: string;
  store_code: string | null;
  quantity: number;
  reserved_quantity: number;
  available: number;
  min_stock: number | null;
};

export type MovementRow = {
  id: number;
  created_at: string | null;
  reason: string;
  change: number;
  sku: string | null;
  product_name: string | null;
  store_code: string | null;
  reference_order_number: string | null;
  transfer_number: string | null;
};

function toDateRange(from: string | null, to: string | null) {
  const fromIso = from ? new Date(from).toISOString() : null;
  // to inclusivo: +1 giorno
  let toIso: string | null = null;
  if (to) {
    const d = new Date(to);
    d.setUTCDate(d.getUTCDate() + 1);
    toIso = d.toISOString();
  }
  return { fromIso, toIso };
}

export async function fetchSales(filters: ReportFilters): Promise<SalesRow[]> {
  const supabase = await createClient();
  const { fromIso, toIso } = toDateRange(filters.from, filters.to);

  let q = supabase
    .from('orders')
    .select(
      'id, order_number, created_at, status, subtotal, tax_amount, total, currency, customer:customers(name), store:stores(code)',
    )
    .in('status', REVENUE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(ROW_LIMIT);
  if (fromIso) q = q.gte('created_at', fromIso);
  if (toIso) q = q.lt('created_at', toIso);
  if (filters.store) q = q.eq('store_id', filters.store);

  const { data } = await q;
  return (data ?? []).map((r) => ({
    id: r.id,
    order_number: r.order_number,
    created_at: r.created_at ?? '',
    status: r.status,
    customer_name: r.customer?.name ?? null,
    store_code: r.store?.code ?? null,
    subtotal: Number(r.subtotal ?? 0),
    tax_amount: Number(r.tax_amount ?? 0),
    total: Number(r.total ?? 0),
    currency: r.currency,
  }));
}

export async function fetchInventory(filters: ReportFilters): Promise<InventoryRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from('stock')
    .select(
      'product_id, store_id, quantity, reserved_quantity, min_stock, product:products(sku, name), store:stores(code)',
    )
    .order('store_id')
    .limit(ROW_LIMIT);
  if (filters.store) q = q.eq('store_id', filters.store);

  const { data } = await q;
  return (data ?? []).map((r) => ({
    product_id: r.product_id,
    store_id: r.store_id,
    sku: r.product?.sku ?? '',
    name: r.product?.name ?? '',
    store_code: r.store?.code ?? null,
    quantity: r.quantity,
    reserved_quantity: r.reserved_quantity,
    available: r.quantity - r.reserved_quantity,
    min_stock: r.min_stock,
  }));
}

export async function fetchMovements(filters: ReportFilters): Promise<MovementRow[]> {
  const supabase = await createClient();
  const { fromIso, toIso } = toDateRange(filters.from, filters.to);

  let q = supabase
    .from('inventory_movements')
    .select(
      'id, created_at, reason, change, product:products(sku, name), store:stores!inventory_movements_store_id_fkey(code), order:orders(order_number), transfer:stock_transfers(transfer_number)',
    )
    .order('created_at', { ascending: false })
    .limit(ROW_LIMIT);
  if (fromIso) q = q.gte('created_at', fromIso);
  if (toIso) q = q.lt('created_at', toIso);
  if (filters.store) q = q.eq('store_id', filters.store);

  const { data } = await q;
  return (data ?? []).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    reason: r.reason,
    change: r.change,
    sku: r.product?.sku ?? null,
    product_name: r.product?.name ?? null,
    store_code: r.store?.code ?? null,
    reference_order_number: r.order?.order_number ?? null,
    transfer_number: r.transfer?.transfer_number ?? null,
  }));
}
