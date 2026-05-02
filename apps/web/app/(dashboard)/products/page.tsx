import Link from 'next/link';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { requireSession } from '@/lib/auth/session';
import { formatInt } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { ProductsCreateButton } from './products-create-button';
import { ProductsRows, type ProductRow } from './products-rows';

export const metadata = { title: 'Produktet — STOKU' };

const PAGE_SIZE = 25;

const CONDITION_LABEL: Record<string, string> = {
  new: 'I ri',
  used: 'I përdorur',
  refurbished: 'I rinovuar',
  damaged: 'I dëmtuar',
};

type SearchParams = {
  q?: string;
  category?: string;
  condition?: string;
  status?: string;
  page?: string;
};

function buildQuery(base: SearchParams, patch: Partial<SearchParams>) {
  const params = new URLSearchParams();
  const merged = { ...base, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireSession();
  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const categoryId = params.category ? Number(params.category) : null;
  const condition = params.condition ?? '';
  const status = params.status ?? 'active';
  const page = Math.max(1, Number(params.page) || 1);

  const supabase = await createClient();

  let query = supabase
    .from('products')
    .select(
      'id, sku, legacy_nr, name, condition, oem_code, vehicle_make, vehicle_model, vehicle_year_from, vehicle_year_to, description, price_sell, price_cost, currency, is_active, category:product_categories(id, name)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (q) {
    // Full-text via colonna generated `search_vector` (simple config) che
    // indicizza name / sku / oem_code / legacy_nr / description. websearch
    // accetta frasi tra virgolette, OR espliciti ed esclusioni con `-`.
    query = query.textSearch('search_vector', q, {
      type: 'websearch',
      config: 'simple',
    });
  }
  if (categoryId) query = query.eq('category_id', categoryId);
  if (condition) query = query.eq('condition', condition);
  if (status === 'active') query = query.eq('is_active', true);
  else if (status === 'inactive') query = query.eq('is_active', false);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [productsRes, categoriesRes] = await Promise.all([
    query.range(from, to),
    supabase.from('product_categories').select('id, name').order('name'),
  ]);

  if (productsRes.error) {
    return (
      <div>
        <PageHeader title="Produktet" />
        <div style={{ padding: 24 }}>
          <p style={{ color: 'var(--danger)' }}>Gabim: {productsRes.error.message}</p>
        </div>
      </div>
    );
  }

  const products = productsRes.data ?? [];
  const categories = categoriesRes.data ?? [];
  const total = productsRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const productIds = products.map((p) => p.id);
  const stockMap = new Map<string, { available: number; total: number }>();
  const perStoreMap = new Map<string, { storeId: number; storeCode: string; available: number }[]>();
  const imagesMap = new Map<string, { id: string; storage_path: string; is_primary: boolean }[]>();
  if (productIds.length > 0) {
    const [stockRes, perStoreRes, imagesRes] = await Promise.all([
      supabase
        .from('v_product_stock_total')
        .select('product_id, total_quantity, total_available')
        .in('product_id', productIds),
      supabase
        .from('stock')
        .select('product_id, store_id, quantity, reserved_quantity, store:stores(code)')
        .in('product_id', productIds),
      supabase
        .from('product_images')
        .select('id, product_id, storage_path, is_primary, sort_order')
        .in('product_id', productIds)
        .order('is_primary', { ascending: false })
        .order('sort_order'),
    ]);
    for (const row of stockRes.data ?? []) {
      if (row.product_id) {
        stockMap.set(row.product_id, {
          available: row.total_available ?? 0,
          total: row.total_quantity ?? 0,
        });
      }
    }
    for (const row of perStoreRes.data ?? []) {
      if (!row.product_id) continue;
      const store = Array.isArray(row.store) ? row.store[0] : row.store;
      const list = perStoreMap.get(row.product_id) ?? [];
      list.push({
        storeId: row.store_id,
        storeCode: (store as { code: string } | null)?.code ?? String(row.store_id),
        available: Math.max(0, (row.quantity ?? 0) - (row.reserved_quantity ?? 0)),
      });
      perStoreMap.set(row.product_id, list);
    }
    for (const img of imagesRes.data ?? []) {
      if (!img.product_id) continue;
      const list = imagesMap.get(img.product_id) ?? [];
      list.push({
        id: img.id,
        storage_path: img.storage_path,
        is_primary: !!img.is_primary,
      });
      imagesMap.set(img.product_id, list);
    }
  }

  const rangeFrom = total === 0 ? 0 : from + 1;
  const rangeTo = Math.min(to + 1, total);
  const activeFilters =
    (q ? 1 : 0) +
    (categoryId ? 1 : 0) +
    (condition ? 1 : 0) +
    (status !== 'active' ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Produktet"
        subtitle={
          total > 0
            ? `${formatInt(total)} produkte në katalog · ${rangeFrom}–${rangeTo} të shfaqura`
            : 'Asnjë produkt — krijo artikullin e parë për të filluar'
        }
        right={<ProductsCreateButton categories={categories} />}
      />

      {/* Inline filter bar */}
      <form
        method="get"
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--stoku-border)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div className="stoku-input" style={{ flex: '1 1 280px', maxWidth: 420, height: 28 }}>
          <Icon name="search" size={13} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder='Kërko…'
            autoComplete="off"
          />
        </div>

        <div className="stoku-input" style={{ width: 180, height: 28 }}>
          <Icon name="filter" size={13} />
          <select name="category" defaultValue={categoryId ? String(categoryId) : ''}>
            <option value="">Të gjitha kategoritë</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="stoku-input" style={{ width: 150, height: 28 }}>
          <select name="condition" defaultValue={condition}>
            <option value="">Gjendja</option>
            {Object.entries(CONDITION_LABEL).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1 }} />

        {(['active', 'inactive', 'all'] as const).map((v) => (
          <Link
            key={v}
            href={`/products${buildQuery(params, { status: v, page: undefined })}`}
            className={status === v ? 'btn primary sm' : 'btn ghost sm'}
          >
            {v === 'active' ? 'Aktive' : v === 'inactive' ? 'Joaktive' : 'Të gjitha'}
          </Link>
        ))}

        {activeFilters > 0 && (
          <button type="submit" className="btn ghost sm">
            <Icon name="search" size={12} /> Kërko
          </button>
        )}
        {(q || categoryId || condition) && (
          <Link href="/products" className="btn ghost sm">Reset</Link>
        )}
      </form>

      <div className="page-body" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Panel padded={false}>
          {products.length === 0 ? (
            <Empty
              icon="box"
              title={activeFilters > 0 ? 'Asnjë produkt gjetur' : 'Asnjë produkt ende'}
              subtitle={
                activeFilters > 0
                  ? 'Provo të ndryshosh filtrat ose rivendos kërkimin.'
                  : 'Krijo produktin e parë për të filluar.'
              }
            />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 36 }} />
                  <th>Produkti</th>
                  <th style={{ width: 130 }}>SKU / OEM</th>
                  <th style={{ width: 160 }}>Mjeti</th>
                  <th style={{ width: 110 }}>Gjendja</th>
                  <th style={{ width: 160 }}>Stok për pikë</th>
                  <th style={{ width: 70, textAlign: 'right' }}>Disp.</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Çmimi</th>
                  <th style={{ width: 120 }} />
                </tr>
              </thead>
              <ProductsRows
                products={products.map(
                  (p): ProductRow => ({
                    id: p.id,
                    sku: p.sku,
                    legacy_nr: p.legacy_nr,
                    name: p.name,
                    condition: p.condition,
                    oem_code: p.oem_code,
                    vehicle_make: p.vehicle_make,
                    vehicle_model: p.vehicle_model,
                    vehicle_year_from: p.vehicle_year_from,
                    vehicle_year_to: p.vehicle_year_to,
                    description: p.description,
                    price_sell: p.price_sell,
                    price_cost: p.price_cost,
                    currency: p.currency,
                    is_active: p.is_active,
                    category: p.category ? { id: p.category.id, name: p.category.name } : null,
                    stock: stockMap.get(p.id) ?? null,
                    perStore: perStoreMap.get(p.id) ?? null,
                    images: imagesMap.get(p.id) ?? [],
                  }),
                )}
                categories={categories}
              />
            </table>
          )}
        </Panel>

        {totalPages > 1 && (
          <div
            className="row"
            style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
          >
            <div className="meta" style={{ fontSize: 11 }}>
              Faqja {page} nga {totalPages}
            </div>
            <div className="row" style={{ gap: 6 }}>
              {page > 1 ? (
                <Link
                  href={`/products${buildQuery(params, { page: String(page - 1) })}`}
                  className="btn ghost sm"
                >
                  <Icon name="chevronLeft" size={12} /> Para
                </Link>
              ) : (
                <span className="btn ghost sm" aria-disabled="true" style={{ opacity: 0.4 }}>
                  <Icon name="chevronLeft" size={12} /> Para
                </span>
              )}
              {page < totalPages ? (
                <Link
                  href={`/products${buildQuery(params, { page: String(page + 1) })}`}
                  className="btn ghost sm"
                >
                  Pas <Icon name="chevronRight" size={12} />
                </Link>
              ) : (
                <span className="btn ghost sm" aria-disabled="true" style={{ opacity: 0.4 }}>
                  Pas <Icon name="chevronRight" size={12} />
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
