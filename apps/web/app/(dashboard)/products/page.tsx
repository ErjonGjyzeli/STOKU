import Link from 'next/link';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuButton } from '@/components/ui/stoku-button';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { ProductsCreateButton } from './products-create-button';
import { ProductsRows, type ProductRow } from './products-rows';

export const metadata = { title: 'Inventario — STOKU' };

const PAGE_SIZE = 25;

const CONDITION_LABEL: Record<string, string> = {
  new: 'Nuovo',
  used: 'Usato',
  refurbished: 'Rigenerato',
  damaged: 'Danneggiato',
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
      'id, sku, legacy_nr, name, condition, oem_code, description, price_sell, price_cost, currency, is_active, category:product_categories(id, name)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (q) {
    const pattern = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    query = query.or(`name.ilike.${pattern},sku.ilike.${pattern},oem_code.ilike.${pattern}`);
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
        <PageHeader title="Inventario" />
        <div style={{ padding: 24 }}>
          <p style={{ color: 'var(--danger)' }}>Errore: {productsRes.error.message}</p>
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
  const imagesMap = new Map<string, { id: string; storage_path: string; is_primary: boolean }[]>();
  if (productIds.length > 0) {
    const [stockRes, imagesRes] = await Promise.all([
      supabase
        .from('v_product_stock_total')
        .select('product_id, total_quantity, total_available')
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
    (q ? 1 : 0) + (categoryId ? 1 : 0) + (condition ? 1 : 0) + (status !== 'active' ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Inventario"
        subtitle={
          total > 0
            ? `${total.toLocaleString('it-IT')} prodotti · ${rangeFrom}–${rangeTo}`
            : 'Nessun prodotto — crea il primo articolo per iniziare'
        }
        right={<ProductsCreateButton categories={categories} />}
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Panel padded>
          <form
            method="get"
            className="row"
            style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}
          >
            <label className="col" style={{ gap: 4, flex: '1 1 260px' }}>
              <span className="meta" style={{ fontSize: 11 }}>
                CERCA
              </span>
              <div className="stoku-input" style={{ height: 32 }}>
                <Icon name="search" size={13} />
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Nome, SKU o codice OEM"
                  autoComplete="off"
                />
              </div>
            </label>

            <label className="col" style={{ gap: 4, width: 200 }}>
              <span className="meta" style={{ fontSize: 11 }}>
                CATEGORIA
              </span>
              <select
                name="category"
                defaultValue={categoryId ? String(categoryId) : ''}
                className="stoku-input"
                style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
              >
                <option value="">Tutte</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="col" style={{ gap: 4, width: 160 }}>
              <span className="meta" style={{ fontSize: 11 }}>
                CONDIZIONE
              </span>
              <select
                name="condition"
                defaultValue={condition}
                className="stoku-input"
                style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
              >
                <option value="">Tutte</option>
                {Object.entries(CONDITION_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="col" style={{ gap: 4, width: 140 }}>
              <span className="meta" style={{ fontSize: 11 }}>
                STATO
              </span>
              <select
                name="status"
                defaultValue={status}
                className="stoku-input"
                style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
              >
                <option value="active">Attivi</option>
                <option value="inactive">Disattivati</option>
                <option value="all">Tutti</option>
              </select>
            </label>

            <div className="row" style={{ gap: 6, marginLeft: 'auto' }}>
              <StokuButton type="submit" variant="primary" size="sm" icon="search">
                Filtra
              </StokuButton>
              {activeFilters > 0 && (
                <Link href="/products" className="btn ghost sm">
                  Reset
                </Link>
              )}
            </div>
          </form>
        </Panel>

        <Panel padded={false}>
          {products.length === 0 ? (
            <Empty
              icon="box"
              title={activeFilters > 0 ? 'Nessun prodotto trovato' : 'Nessun prodotto ancora'}
              subtitle={
                activeFilters > 0
                  ? 'Prova a modificare i filtri o resetta la ricerca.'
                  : 'La creazione del primo prodotto arriva nello step successivo (F2.2).'
              }
            />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 130 }}>SKU</th>
                  <th>Nome</th>
                  <th style={{ width: 160 }}>Categoria</th>
                  <th style={{ width: 110 }}>Condizione</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Prezzo</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Disp.</th>
                  <th style={{ width: 100 }}>Stato</th>
                  <th style={{ width: 110 }} />
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
                    description: p.description,
                    price_sell: p.price_sell,
                    price_cost: p.price_cost,
                    currency: p.currency,
                    is_active: p.is_active,
                    category: p.category
                      ? { id: p.category.id, name: p.category.name }
                      : null,
                    stock: stockMap.get(p.id) ?? null,
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
            <div className="meta" style={{ fontSize: 12 }}>
              Pagina {page} di {totalPages}
            </div>
            <div className="row" style={{ gap: 6 }}>
              {page > 1 ? (
                <Link
                  href={`/products${buildQuery(params, { page: String(page - 1) })}`}
                  className="btn ghost sm"
                >
                  <Icon name="chevronLeft" size={12} /> Precedente
                </Link>
              ) : (
                <span className="btn ghost sm" aria-disabled="true" style={{ opacity: 0.4 }}>
                  <Icon name="chevronLeft" size={12} /> Precedente
                </span>
              )}
              {page < totalPages ? (
                <Link
                  href={`/products${buildQuery(params, { page: String(page + 1) })}`}
                  className="btn ghost sm"
                >
                  Successiva <Icon name="chevronRight" size={12} />
                </Link>
              ) : (
                <span className="btn ghost sm" aria-disabled="true" style={{ opacity: 0.4 }}>
                  Successiva <Icon name="chevronRight" size={12} />
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
