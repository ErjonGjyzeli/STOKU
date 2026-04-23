import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

type BadgeVariant = 'default' | 'ok' | 'warn' | 'danger' | 'info' | 'draft' | 'accent';

const CONDITION_LABEL: Record<string, string> = {
  new: 'Nuovo',
  used: 'Usato',
  refurbished: 'Rigenerato',
  damaged: 'Danneggiato',
};

const CONDITION_VARIANT: Record<string, BadgeVariant> = {
  new: 'ok',
  used: 'default',
  refurbished: 'info',
  damaged: 'warn',
};

function yearRange(from: number | null, to: number | null) {
  if (from && to) return `${from}–${to}`;
  if (from) return `${from}+`;
  if (to) return `→${to}`;
  return null;
}

function currency(value: number | null, code: string | null) {
  if (value == null) return null;
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: code ?? 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id: idStr } = await params;
  const vehicleId = Number(idStr);
  if (!Number.isInteger(vehicleId) || vehicleId <= 0) notFound();

  const supabase = await createClient();

  const { data: vehicle, error: vErr } = await supabase
    .from('vehicles')
    .select(
      'id, model, chassis_code, year_from, year_to, engine, make:vehicle_makes(id, name)',
    )
    .eq('id', vehicleId)
    .single();
  if (vErr || !vehicle) notFound();

  const { data: compatRows } = await supabase
    .from('product_vehicle_compatibility')
    .select('product_id')
    .eq('vehicle_id', vehicleId);
  const productIds = (compatRows ?? [])
    .map((r) => r.product_id)
    .filter((id): id is string => !!id);

  let products: Array<{
    id: string;
    sku: string;
    legacy_nr: string | null;
    name: string;
    condition: string;
    price_sell: number | null;
    currency: string | null;
    is_active: boolean | null;
    category: { id: number; name: string } | null;
  }> = [];

  if (productIds.length > 0) {
    const { data } = await supabase
      .from('products')
      .select(
        'id, sku, legacy_nr, name, condition, price_sell, currency, is_active, category:product_categories(id, name)',
      )
      .in('id', productIds)
      .order('name');
    products = data ?? [];
  }

  const years = yearRange(vehicle.year_from, vehicle.year_to);
  const subtitleParts = [
    vehicle.chassis_code && `Telaio ${vehicle.chassis_code}`,
    years,
    vehicle.engine,
  ].filter(Boolean);

  return (
    <div>
      <PageHeader
        title={`${vehicle.make?.name ?? '—'} ${vehicle.model}`}
        subtitle={subtitleParts.length > 0 ? subtitleParts.join(' · ') : undefined}
        breadcrumb={[
          { label: 'Veicoli' },
          { label: `${vehicle.make?.name ?? ''} ${vehicle.model}` },
        ]}
        right={
          <Link
            href={`/products?vehicle=${vehicleId}`}
            className="btn ghost sm"
            title="Filtra inventario per questo veicolo"
          >
            <Icon name="box" size={12} /> Inventario filtrato
          </Link>
        }
      />
      <div style={{ padding: 24 }}>
        <Panel title={`Prodotti compatibili (${products.length})`} padded={false}>
          {products.length === 0 ? (
            <Empty
              icon="box"
              title="Nessun prodotto compatibile"
              subtitle={
                'Aggiungi compatibilità da una riga di /products → icona auto → seleziona questo veicolo.'
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
                  <th style={{ width: 100 }}>Stato</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="mono" style={{ fontWeight: 500, fontSize: 11 }}>
                      {p.sku}
                    </td>
                    <td className="truncate-1" style={{ maxWidth: 360 }}>
                      {p.name}
                      {p.legacy_nr && (
                        <span className="faint mono" style={{ marginLeft: 8, fontSize: 11 }}>
                          #{p.legacy_nr}
                        </span>
                      )}
                    </td>
                    <td>
                      {p.category?.name ? (
                        <StokuBadge>{p.category.name}</StokuBadge>
                      ) : (
                        <span className="faint">—</span>
                      )}
                    </td>
                    <td>
                      <StokuBadge variant={CONDITION_VARIANT[p.condition] ?? 'default'}>
                        {CONDITION_LABEL[p.condition] ?? p.condition}
                      </StokuBadge>
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {currency(p.price_sell, p.currency) ?? <span className="faint">—</span>}
                    </td>
                    <td>
                      {p.is_active ? (
                        <StokuBadge variant="ok" dot>
                          Attivo
                        </StokuBadge>
                      ) : (
                        <StokuBadge variant="draft">Disattivato</StokuBadge>
                      )}
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
