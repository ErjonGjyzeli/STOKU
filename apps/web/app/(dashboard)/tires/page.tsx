import Link from 'next/link';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { requireSession } from '@/lib/auth/session';
import { formatCurrency, formatInt } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { TiresCreateButton } from './tires-create-button';
import { TiresFilterBar, type TiresFilters } from './tires-filter-bar';

export const metadata = { title: 'Pneumatici — STOKU' };

const PAGE_SIZE = 25;

const BUCKET_PUBLIC_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images`;

function publicUrl(path: string) {
  return `${BUCKET_PUBLIC_URL}/${path}`;
}

const SEASON_TO_SLUG: Record<string, string> = {
  summer: 'tires-summer',
  winter: 'tires-winter',
  allseason: 'tires-allseason',
};

type SearchParams = {
  q?: string;
  width?: string;
  aspect?: string;
  diameter?: string;
  season?: string;
  tread_min?: string;
  dot_max?: string;
  set4?: string;
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

function formatSize(
  width: number | null,
  aspect: number | null,
  diameter: number | null,
): string | null {
  if (width == null || aspect == null || diameter == null) return null;
  // Diametro normalmente intero (16, 17) — mostra senza decimale se .0
  const d = Number(diameter);
  const dStr = Number.isInteger(d) ? String(d) : d.toFixed(1);
  return `${width}/${aspect} R${dStr}`;
}

function formatPrice(value: number | null, code: string | null) {
  if (value == null) return null;
  return formatCurrency(value, code);
}

export default async function TiresPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireSession();
  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const width = params.width ? Number(params.width) : null;
  const aspect = params.aspect ? Number(params.aspect) : null;
  const diameter = params.diameter ? Number(params.diameter) : null;
  const seasonRaw = params.season ?? '';
  const season = seasonRaw in SEASON_TO_SLUG ? (seasonRaw as keyof typeof SEASON_TO_SLUG) : '';
  const treadMin = params.tread_min ? Number(params.tread_min) : null;
  const dotMax = (params.dot_max ?? '').trim();
  const set4 = params.set4 === '1';
  const page = Math.max(1, Number(params.page) || 1);

  const supabase = await createClient();

  // Pre-filtro set4: ottiene i product_id con stock totale ≥ 4 prima della
  // query principale, così il count: 'exact' resta accurato e la
  // paginazione funziona.
  let set4Ids: string[] | null = null;
  if (set4) {
    const { data } = await supabase
      .from('v_product_stock_total')
      .select('product_id, total_quantity')
      .gte('total_quantity', 4);
    set4Ids = (data ?? [])
      .map((r) => r.product_id)
      .filter((id): id is string => !!id);
    // Se nessun prodotto soddisfa, esiste un caso di "no results" coerente.
    if (set4Ids.length === 0) set4Ids = ['00000000-0000-0000-0000-000000000000'];
  }

  let query = supabase
    .from('products')
    .select(
      'id, sku, name, condition, vehicle_make, description, price_sell, currency, is_active, tire_width, tire_aspect, tire_diameter, tire_load_index, tire_speed_index, tire_tread_mm, tire_dot, tire_runflat, tire_reinforced, category:product_categories!inner(id, name, slug, kind)',
      { count: 'exact' },
    )
    .eq('category.kind', 'gomma')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (q) {
    query = query.textSearch('search_vector', q, { type: 'websearch', config: 'simple' });
  }
  if (width != null && Number.isFinite(width)) query = query.eq('tire_width', width);
  if (aspect != null && Number.isFinite(aspect)) query = query.eq('tire_aspect', aspect);
  if (diameter != null && Number.isFinite(diameter)) query = query.eq('tire_diameter', diameter);
  if (season) query = query.eq('category.slug', SEASON_TO_SLUG[season]);
  if (treadMin != null && Number.isFinite(treadMin)) {
    query = query.gte('tire_tread_mm', treadMin);
  }
  if (dotMax) {
    // TODO: parsing rigoroso DOT (formato WWYY o WWYYYY) lato DB.
    // Per ora confronto testuale: filtra prodotti il cui DOT contiene un anno
    // ≤ dotMax. Approssimazione accettabile finché i dati sono semi-popolati.
    query = query.lte('tire_dot', dotMax);
  }
  if (set4Ids) query = query.in('id', set4Ids);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [productsRes, tireCategoriesRes] = await Promise.all([
    query.range(from, to),
    supabase
      .from('product_categories')
      .select('id, name, slug')
      .eq('kind', 'gomma')
      .order('name'),
  ]);
  const tireCategories = tireCategoriesRes.data ?? [];

  if (productsRes.error) {
    return (
      <div>
        <PageHeader title="Pneumatici" />
        <div style={{ padding: 24 }}>
          <p style={{ color: 'var(--danger)' }}>Errore: {productsRes.error.message}</p>
        </div>
      </div>
    );
  }

  const products = productsRes.data ?? [];
  const total = productsRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const productIds = products.map((p) => p.id);
  const stockMap = new Map<string, { available: number; total: number }>();
  const imagesMap = new Map<string, string>(); // product_id → primary storage_path
  if (productIds.length > 0) {
    const [stockRes, imagesRes] = await Promise.all([
      supabase
        .from('v_product_stock_total')
        .select('product_id, total_quantity, total_available')
        .in('product_id', productIds),
      supabase
        .from('product_images')
        .select('product_id, storage_path, is_primary, sort_order')
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
      if (!imagesMap.has(img.product_id)) {
        imagesMap.set(img.product_id, img.storage_path);
      }
    }
  }

  const rangeFrom = total === 0 ? 0 : from + 1;
  const rangeTo = Math.min(to + 1, total);
  const hasFilters =
    !!q ||
    width != null ||
    aspect != null ||
    diameter != null ||
    !!season ||
    treadMin != null ||
    !!dotMax ||
    set4;

  const initialFilters: TiresFilters = {
    q,
    width: params.width ?? '',
    aspect: params.aspect ?? '',
    diameter: params.diameter ?? '',
    season: (season || '') as TiresFilters['season'],
    treadMin: params.tread_min ?? '',
    dotMax: dotMax,
    set4,
  };

  return (
    <div>
      <PageHeader
        title="Pneumatici"
        subtitle={
          total > 0
            ? `${formatInt(total)} pneumatici · ${rangeFrom}–${rangeTo}`
            : 'Nessun pneumatico trovato'
        }
        right={<TiresCreateButton categories={tireCategories} />}
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Panel padded>
          <TiresFilterBar initial={initialFilters} hasFilters={hasFilters} />
        </Panel>

        <Panel padded={false}>
          {products.length === 0 ? (
            <Empty
              icon="disc"
              title={hasFilters ? 'Nessun pneumatico trovato' : 'Nessun pneumatico ancora'}
              subtitle={
                hasFilters
                  ? 'Prova a rimuovere qualche filtro o cambiare misura.'
                  : 'Aggiungi pneumatici da Inventario assegnando una categoria gomma (estive, invernali, 4 stagioni).'
              }
            />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 56 }} />
                  <th style={{ width: 130 }}>SKU</th>
                  <th style={{ width: 140 }}>Misura</th>
                  <th>Marca / Modello</th>
                  <th style={{ width: 90 }}>DOT</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Battistr.</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Prezzo</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Disp.</th>
                  <th style={{ width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const size = formatSize(p.tire_width, p.tire_aspect, p.tire_diameter);
                  const sizeIndex =
                    p.tire_load_index != null && p.tire_speed_index
                      ? `${p.tire_load_index}${p.tire_speed_index}`
                      : null;
                  const price = formatPrice(p.price_sell, p.currency);
                  const stock = stockMap.get(p.id);
                  const thumb = imagesMap.get(p.id);
                  return (
                    <tr key={p.id}>
                      <td>
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={publicUrl(thumb)}
                            alt=""
                            width={36}
                            height={36}
                            style={{
                              width: 36,
                              height: 36,
                              objectFit: 'cover',
                              borderRadius: 'var(--r-sm)',
                              border: '1px solid var(--stoku-border)',
                              background: 'var(--panel-2)',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 'var(--r-sm)',
                              border: '1px solid var(--stoku-border)',
                              background: 'var(--panel-2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--ink-4)',
                            }}
                          >
                            <Icon name="disc" size={16} />
                          </div>
                        )}
                      </td>
                      <td className="mono" style={{ fontWeight: 500, fontSize: 11 }}>
                        {p.sku}
                      </td>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {size ?? <span className="faint">—</span>}
                        {sizeIndex && (
                          <span className="faint" style={{ marginLeft: 6 }}>
                            {sizeIndex}
                          </span>
                        )}
                        {(p.tire_runflat || p.tire_reinforced) && (
                          <div className="row" style={{ gap: 4, marginTop: 2 }}>
                            {p.tire_runflat && (
                              <StokuBadge variant="info">RFT</StokuBadge>
                            )}
                            {p.tire_reinforced && (
                              <StokuBadge variant="info">XL</StokuBadge>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="truncate-1" style={{ maxWidth: 280 }}>
                        {p.vehicle_make ? (
                          <span style={{ fontWeight: 500 }}>{p.vehicle_make}</span>
                        ) : (
                          <span className="faint">—</span>
                        )}
                        <span className="faint" style={{ marginLeft: 6 }}>
                          {p.name}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        {p.tire_dot ?? <span className="faint">—</span>}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {p.tire_tread_mm != null ? (
                          `${Number(p.tire_tread_mm).toFixed(1)} mm`
                        ) : (
                          <span className="faint">—</span>
                        )}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {price ?? <span className="faint">—</span>}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {stock ? (
                          <StokuBadge variant={stock.available >= 4 ? 'ok' : stock.available > 0 ? 'default' : 'draft'}>
                            {stock.available}
                          </StokuBadge>
                        ) : (
                          <span className="faint">0</span>
                        )}
                      </td>
                      <td>
                        <a
                          href={`/tires/${p.id}/label`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn ghost"
                          style={{ padding: 4, width: 28, height: 28 }}
                          title="Stampa etichetta"
                        >
                          <Icon name="tag" size={13} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
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
                  href={`/tires${buildQuery(params, { page: String(page - 1) })}`}
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
                  href={`/tires${buildQuery(params, { page: String(page + 1) })}`}
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
