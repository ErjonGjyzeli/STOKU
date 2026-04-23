import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { VehiclesClient, type VehicleRow } from './vehicles-client';

export const metadata = { title: 'Veicoli — STOKU' };

export default async function VehiclesPage() {
  await requireSession();
  const supabase = await createClient();

  const [vehiclesRes, makesRes] = await Promise.all([
    supabase
      .from('vehicles')
      .select(
        'id, make_id, model, chassis_code, year_from, year_to, engine, make:vehicle_makes(name)',
      )
      .order('model'),
    supabase.from('vehicle_makes').select('id, name').order('name'),
  ]);

  if (vehiclesRes.error) {
    return (
      <p style={{ padding: 24, color: 'var(--danger)' }}>Errore: {vehiclesRes.error.message}</p>
    );
  }

  const rows: VehicleRow[] = (vehiclesRes.data ?? []).map((v) => ({
    id: v.id,
    make_id: v.make_id ?? null,
    make_name: v.make?.name ?? null,
    model: v.model,
    chassis_code: v.chassis_code,
    year_from: v.year_from,
    year_to: v.year_to,
    engine: v.engine,
  }));

  return <VehiclesClient vehicles={rows} makes={makesRes.data ?? []} total={rows.length} />;
}
