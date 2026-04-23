import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import {
  TransferDetailClient,
  type ProductOption,
  type TransferItemRow,
  type TransferSummary,
} from './transfer-detail-client';

export const metadata = { title: 'Trasferimento — STOKU' };

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function TransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const { data: transfer, error } = await supabase
    .from('stock_transfers')
    .select(
      'id, transfer_number, status, from_store_id, to_store_id, notes, created_at, shipped_at, received_at, from_store:stores!stock_transfers_from_store_id_fkey(code, name), to_store:stores!stock_transfers_to_store_id_fkey(code, name)',
    )
    .eq('id', id)
    .single();
  if (error || !transfer) notFound();

  const { data: itemsRaw } = await supabase
    .from('stock_transfer_items')
    .select('id, product_id, quantity, quantity_received, product:products(sku, name)')
    .eq('transfer_id', id)
    .order('id');

  const items: TransferItemRow[] = (itemsRaw ?? []).map((r) => ({
    id: r.id,
    product_id: r.product_id,
    sku: r.product?.sku ?? '—',
    name: r.product?.name ?? '—',
    quantity: r.quantity,
    quantity_received: r.quantity_received,
  }));

  // Prodotti disponibili allo store di origine (per il picker): fetch
  // limitato a stock > 0 per evitare di mostrare prodotti non acquisibili.
  const { data: stockRows } = await supabase
    .from('stock')
    .select('product_id, quantity, reserved_quantity, product:products(id, sku, name, is_active)')
    .eq('store_id', transfer.from_store_id)
    .gt('quantity', 0);
  const products: ProductOption[] = (stockRows ?? [])
    .filter((r) => r.product?.is_active !== false)
    .filter((r) => r.quantity - r.reserved_quantity > 0)
    .map((r) => ({
      id: r.product!.id,
      sku: r.product!.sku,
      name: r.product!.name,
    }));

  const summary: TransferSummary = {
    id: transfer.id,
    transfer_number: transfer.transfer_number,
    status: transfer.status,
    from_store_id: transfer.from_store_id,
  };

  return (
    <div>
      <PageHeader
        title={`Trasferimento ${transfer.transfer_number}`}
        subtitle={`${transfer.from_store?.code ?? ''} → ${transfer.to_store?.code ?? ''}`}
        breadcrumb={[{ label: 'Trasferimenti' }, { label: transfer.transfer_number }]}
        right={
          <Link href="/transfers" className="btn ghost sm">
            Torna ai trasferimenti
          </Link>
        }
      />
      <div
        style={{
          padding: 24,
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 320px) 1fr',
          gap: 16,
        }}
      >
        <div className="col" style={{ gap: 16 }}>
          <Panel title="Dettagli">
            <dl className="col" style={{ gap: 8, margin: 0, fontSize: 13 }}>
              <Detail
                label="Origine"
                value={
                  transfer.from_store
                    ? `${transfer.from_store.code} · ${transfer.from_store.name}`
                    : '—'
                }
              />
              <Detail
                label="Destinazione"
                value={
                  transfer.to_store
                    ? `${transfer.to_store.code} · ${transfer.to_store.name}`
                    : '—'
                }
              />
              <Detail label="Creato" value={formatDate(transfer.created_at) ?? '—'} />
              {transfer.shipped_at && (
                <Detail label="Spedito" value={formatDate(transfer.shipped_at) ?? '—'} />
              )}
              {transfer.received_at && (
                <Detail label="Ricevuto" value={formatDate(transfer.received_at) ?? '—'} />
              )}
              {transfer.notes && <Detail label="Note" value={transfer.notes} />}
            </dl>
          </Panel>
        </div>

        <TransferDetailClient transfer={summary} items={items} products={products} />
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
