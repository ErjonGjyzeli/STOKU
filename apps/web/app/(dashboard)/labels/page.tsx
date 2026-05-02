import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuButton } from '@/components/ui/stoku-button';
import { requireSession } from '@/lib/auth/session';
import { formatInt } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { countLabelTargets, type LabelFilters, type LabelKind } from './filters';

export const metadata = { title: 'Etiketat — STOKU' };

type SearchParams = {
  kind?: string;
  format?: string;
  store_id?: string;
  only_unprinted?: string;
  since_days?: string;
};

function parseUiParams(sp: SearchParams): {
  kind: LabelKind;
  format: 'a4' | 'thermal';
  filters: LabelFilters;
} {
  const kind: LabelKind =
    sp.kind === 'shelves' ? 'shelves' : sp.kind === 'tires' ? 'tires' : 'products';
  const format = sp.format === 'thermal' ? 'thermal' : 'a4';
  const store_id = sp.store_id ? Number(sp.store_id) : null;
  const only_unprinted = sp.only_unprinted === '1';
  const since_days =
    sp.since_days && sp.since_days.trim() ? Number(sp.since_days) : null;
  return {
    kind,
    format,
    filters: {
      ids: null,
      store_id: Number.isFinite(store_id) && store_id ? store_id : null,
      only_unprinted,
      since_days: Number.isFinite(since_days) && since_days ? since_days : null,
    },
  };
}

function buildPdfHref(
  kind: LabelKind,
  format: 'a4' | 'thermal',
  filters: LabelFilters,
): string {
  const sp = new URLSearchParams();
  sp.set('kind', kind);
  sp.set('format', format);
  if (filters.store_id !== null) sp.set('store_id', String(filters.store_id));
  if (filters.only_unprinted) sp.set('only_unprinted', '1');
  if (filters.since_days !== null) sp.set('since_days', String(filters.since_days));
  return `/labels/pdf?${sp.toString()}`;
}

export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const { kind, format, filters } = parseUiParams(params);

  const supabase = await createClient();
  const storesRes = await supabase
    .from('stores')
    .select('id, code, name')
    .eq('is_active', true)
    .order('code');
  const stores = storesRes.data ?? [];

  // Default: PV attivo se l'utente non ha specificato store_id.
  const effectiveFilters: LabelFilters = {
    ...filters,
    store_id:
      filters.store_id ??
      (params.store_id === undefined ? session.activeStoreId : null),
  };

  const count = await countLabelTargets(supabase, kind, effectiveFilters);
  const pdfHref = buildPdfHref(kind, format, effectiveFilters);

  return (
    <div>
      <PageHeader
        title="Printo etiketat"
        subtitle="Gjenero PDF për printer A4 (24-up) ose termik single (Brother QL)"
      />

      <div className="page-body" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Panel padded>
          <form
            method="get"
            className="col"
            style={{ gap: 16 }}
          >
            <div className="row" style={{ gap: 24, flexWrap: 'wrap' }}>
              <fieldset
                style={{ border: 'none', padding: 0, display: 'flex', gap: 16 }}
              >
                <legend
                  className="meta"
                  style={{ fontSize: 10, marginBottom: 6 }}
                >
                  TIPO
                </legend>
                <label className="row" style={{ gap: 6, alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="kind"
                    value="products"
                    defaultChecked={kind === 'products'}
                  />
                  Produktet
                </label>
                <label className="row" style={{ gap: 6, alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="kind"
                    value="tires"
                    defaultChecked={kind === 'tires'}
                  />
                  Gomat
                </label>
                <label className="row" style={{ gap: 6, alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="kind"
                    value="shelves"
                    defaultChecked={kind === 'shelves'}
                  />
                  Raftet
                </label>
              </fieldset>

              <fieldset
                style={{ border: 'none', padding: 0, display: 'flex', gap: 16 }}
              >
                <legend
                  className="meta"
                  style={{ fontSize: 10, marginBottom: 6 }}
                >
                  FORMATO
                </legend>
                <label className="row" style={{ gap: 6, alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="format"
                    value="a4"
                    defaultChecked={format === 'a4'}
                  />
                  A4 24-up
                </label>
                <label className="row" style={{ gap: 6, alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="format"
                    value="thermal"
                    defaultChecked={format === 'thermal'}
                  />
                  Termik single
                </label>
              </fieldset>
            </div>

            <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label className="col" style={{ gap: 4, width: 220 }}>
                <span className="meta" style={{ fontSize: 10 }}>
                  PIKA E SHITJES
                </span>
                <select
                  name="store_id"
                  defaultValue={
                    effectiveFilters.store_id !== null
                      ? String(effectiveFilters.store_id)
                      : ''
                  }
                  className="stoku-input"
                  style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
                >
                  <option value="">Të gjitha</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="col" style={{ gap: 4, width: 160 }}>
                <span className="meta" style={{ fontSize: 10 }}>
                  KRIJUAR DITËT E FUNDIT N
                </span>
                <input
                  type="number"
                  name="since_days"
                  min={1}
                  defaultValue={
                    effectiveFilters.since_days !== null
                      ? String(effectiveFilters.since_days)
                      : ''
                  }
                  placeholder="—"
                  className="stoku-input"
                  style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
                />
              </label>

              <label
                className="row"
                style={{ gap: 6, alignItems: 'center', height: 32, fontSize: 11 }}
              >
                <input
                  type="checkbox"
                  name="only_unprinted"
                  value="1"
                  defaultChecked={effectiveFilters.only_unprinted}
                />
                Vetëm të pashtypura
              </label>

              <div className="row" style={{ gap: 6, marginLeft: 'auto' }}>
                <StokuButton type="submit" variant="primary" size="sm" icon="filter">
                  Përditëso pamjen
                </StokuButton>
              </div>
            </div>
          </form>
        </Panel>

        <Panel padded>
          <div className="row" style={{ gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="col" style={{ gap: 4 }}>
              <span className="meta" style={{ fontSize: 10, textTransform: 'uppercase' }}>
                Pamja paraprake
              </span>
              <div style={{ fontSize: 22, fontWeight: 600 }}>
                {formatInt(count)} etiket{count === 1 ? 'ë' : 'a'}
              </div>
              <div className="meta" style={{ fontSize: 11 }}>
                {kind === 'products' ? 'Produktet' : kind === 'tires' ? 'Gomat' : 'Raftet'} ·{' '}
                {format === 'a4' ? 'A4 24-up' : 'Termik single'}
              </div>
            </div>

            <div style={{ marginLeft: 'auto' }}>
              {count > 0 ? (
                <a
                  href={pdfHref}
                  target="_blank"
                  rel="noreferrer"
                  className="btn primary"
                >
                  <Icon name="print" size={13} /> Gjenero PDF
                </a>
              ) : (
                <span
                  className="btn ghost"
                  aria-disabled="true"
                  style={{ opacity: 0.5 }}
                >
                  <Icon name="print" size={13} /> Asnjë element
                </span>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
