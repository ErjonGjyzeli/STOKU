// Filtri condivisi tra route handler `/labels` e pagina UI generator.
// Estratti per evitare drift fra anteprima count e query effettiva.
//
// Semantica `only_unprinted`: `last_label_printed_at is null`.
// Niente staleness window — chi ha bisogno di ristampare deresetta a mano.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export type LabelKind = 'products' | 'tires' | 'shelves';
export type LabelFormat = 'a4' | 'thermal';

export type LabelFilters = {
  ids: string[] | null;
  store_id: number | null;
  only_unprinted: boolean;
  since_days: number | null;
};

export type ParsedLabelParams = LabelFilters & {
  kind: LabelKind;
  format: LabelFormat;
};

type Result =
  | { ok: true; value: ParsedLabelParams }
  | { ok: false; error: string };

export function parseLabelParams(sp: URLSearchParams): Result {
  const kindRaw = sp.get('kind');
  if (kindRaw !== 'products' && kindRaw !== 'tires' && kindRaw !== 'shelves') {
    return { ok: false, error: 'Parametro `kind` obbligatorio: products|tires|shelves' };
  }
  const formatRaw = sp.get('format') ?? 'a4';
  if (formatRaw !== 'a4' && formatRaw !== 'thermal') {
    return { ok: false, error: 'Parametro `format` non valido: a4|thermal' };
  }

  const idsRaw = sp.get('ids');
  let ids: string[] | null = null;
  if (idsRaw && idsRaw.trim()) {
    ids = idsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) ids = null;
  }

  const storeRaw = sp.get('store_id');
  let store_id: number | null = null;
  if (storeRaw && storeRaw.trim()) {
    const n = Number(storeRaw);
    if (!Number.isInteger(n) || n <= 0) {
      return { ok: false, error: 'Parametro `store_id` non valido' };
    }
    store_id = n;
  }

  const only_unprinted = sp.get('only_unprinted') === '1' || sp.get('only_unprinted') === 'true';

  const sinceRaw = sp.get('since_days');
  let since_days: number | null = null;
  if (sinceRaw && sinceRaw.trim()) {
    const n = Number(sinceRaw);
    if (!Number.isInteger(n) || n <= 0) {
      return { ok: false, error: 'Parametro `since_days` non valido' };
    }
    since_days = n;
  }

  return {
    ok: true,
    value: { kind: kindRaw, format: formatRaw, ids, store_id, only_unprinted, since_days },
  };
}

export function sinceIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

type Sb = SupabaseClient<Database>;

// Anteprima count: stessi predicati delle query reali nel route handler.
// Tenuto in sync manualmente. Se aggiungi un filtro, aggiornalo in entrambi.
export async function countLabelTargets(
  supabase: Sb,
  kind: LabelKind,
  filters: LabelFilters,
): Promise<number> {
  if (kind === 'products') {
    let q =
      filters.store_id !== null
        ? supabase
            .from('products')
            .select('id, stock!inner(store_id)', { count: 'exact', head: true })
            .eq('stock.store_id', filters.store_id)
            .eq('is_active', true)
        : supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true);
    if (filters.ids && filters.ids.length > 0) q = q.in('id', filters.ids);
    if (filters.only_unprinted) q = q.is('last_label_printed_at', null);
    if (filters.since_days !== null) q = q.gte('created_at', sinceIso(filters.since_days));
    const { count } = await q;
    return count ?? 0;
  }
  if (kind === 'tires') {
    let q =
      filters.store_id !== null
        ? supabase
            .from('products')
            .select('id, product_categories!inner(kind), stock!inner(store_id)', { count: 'exact', head: true })
            .eq('product_categories.kind', 'gomma')
            .eq('stock.store_id', filters.store_id)
            .eq('is_active', true)
        : supabase
            .from('products')
            .select('id, product_categories!inner(kind)', { count: 'exact', head: true })
            .eq('product_categories.kind', 'gomma')
            .eq('is_active', true);
    if (filters.ids && filters.ids.length > 0) q = q.in('id', filters.ids);
    if (filters.only_unprinted) q = q.is('last_label_printed_at', null);
    if (filters.since_days !== null) q = q.gte('created_at', sinceIso(filters.since_days));
    const { count } = await q;
    return count ?? 0;
  }
  let q = supabase
    .from('shelves')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);
  if (filters.ids && filters.ids.length > 0) q = q.in('id', filters.ids);
  if (filters.store_id !== null) q = q.eq('store_id', filters.store_id);
  if (filters.only_unprinted) q = q.is('last_label_printed_at', null);
  if (filters.since_days !== null) q = q.gte('created_at', sinceIso(filters.since_days));
  const { count } = await q;
  return count ?? 0;
}
