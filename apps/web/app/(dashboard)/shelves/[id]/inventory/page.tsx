import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { InventoryCountClient, type CountRow } from './inventory-count-client';

export const metadata = { title: 'Inventar rafti — STOKU' };

const idSchema = z.string().uuid();

const BUCKET_PUBLIC_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images`;

function publicUrl(path: string) {
  return `${BUCKET_PUBLIC_URL}/${path}`;
}

export default async function ShelfInventoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const idCheck = idSchema.safeParse(id);
  if (!idCheck.success) notFound();

  const role = session.profile.role;
  if (role !== 'admin' && role !== 'warehouse') {
    redirect(`/shelves/${idCheck.data}`);
  }

  const supabase = await createClient();

  const { data: shelf, error: shelfErr } = await supabase
    .from('shelves')
    .select(
      'id, code, description, kind, is_active, store_id, store:stores(id, code, name)',
    )
    .eq('id', idCheck.data)
    .maybeSingle();
  if (shelfErr) {
    return <p style={{ padding: 24, color: 'var(--danger)' }}>Gabim: {shelfErr.message}</p>;
  }
  if (!shelf) notFound();

  if (role === 'warehouse') {
    const inScope = session.stores.some((s) => s.id === shelf.store_id);
    if (!inScope) redirect(`/shelves/${shelf.id}`);
  }

  const { data: stockRows } = await supabase
    .from('stock')
    .select(
      'product_id, quantity, reserved_quantity, product:products(id, sku, name, is_active)',
    )
    .eq('shelf_id', shelf.id)
    .order('product_id');

  const items = stockRows ?? [];
  const productIds = items.map((r) => r.product_id);
  const imagesMap = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: imgs } = await supabase
      .from('product_images')
      .select('product_id, storage_path, is_primary, sort_order')
      .in('product_id', productIds)
      .order('is_primary', { ascending: false })
      .order('sort_order');
    for (const img of imgs ?? []) {
      if (!img.product_id || imagesMap.has(img.product_id)) continue;
      imagesMap.set(img.product_id, img.storage_path);
    }
  }

  const rows: CountRow[] = items.map((r) => ({
    productId: r.product_id,
    sku: r.product?.sku ?? '—',
    name: r.product?.name ?? '—',
    isActive: r.product?.is_active !== false,
    logical: r.quantity ?? 0,
    reserved: r.reserved_quantity ?? 0,
    imageUrl: imagesMap.get(r.product_id) ? publicUrl(imagesMap.get(r.product_id)!) : null,
  }));

  return (
    <div>
      <PageHeader
        breadcrumb={[
          { label: 'Raftet', href: '/shelves' },
          { label: shelf.code, href: `/shelves/${shelf.id}` },
          { label: 'Inventar' },
        ]}
        title={
          <span className="row" style={{ gap: 10, alignItems: 'center' }}>
            <Icon name="check" size={16} />
            <span>Inventar fizik</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              {shelf.code}
            </span>
            {!shelf.is_active && <StokuBadge variant="draft">Çaktivizuar</StokuBadge>}
          </span>
        }
        subtitle={
          <span>
            {shelf.store?.code ? `${shelf.store.code} · ${shelf.store.name}` : ''}
            {shelf.description ? ` — ${shelf.description}` : ''}
          </span>
        }
        right={
          <Link href={`/shelves/${shelf.id}`} className="btn ghost sm">
            <Icon name="chevronLeft" size={12} /> Kthehu te rafti
          </Link>
        }
      />

      <div className="page-body" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {rows.length === 0 ? (
          <Panel padded={false}>
            <Empty
              icon="box"
              title="Rafti bosh"
              subtitle="Asnjë produkt për t'u kontuar në këtë raft."
            />
          </Panel>
        ) : (
          <InventoryCountClient
            shelf={{ id: shelf.id, code: shelf.code }}
            rows={rows}
          />
        )}
      </div>
    </div>
  );
}
