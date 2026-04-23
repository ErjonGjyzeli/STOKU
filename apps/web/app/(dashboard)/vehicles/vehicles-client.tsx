'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuButton } from '@/components/ui/stoku-button';
import { createVehicle, deleteVehicle, updateVehicle, type VehicleInput } from './actions';
import { VehicleFormDialog, type Make, type VehicleFormValues } from './vehicle-form-dialog';

export type VehicleRow = {
  id: number;
  make_id: number | null;
  make_name: string | null;
  model: string;
  chassis_code: string | null;
  year_from: number | null;
  year_to: number | null;
  engine: string | null;
};

function toForm(v: VehicleRow): VehicleFormValues {
  return {
    make_id: v.make_id ? String(v.make_id) : '',
    model: v.model,
    chassis_code: v.chassis_code ?? '',
    year_from: v.year_from != null ? String(v.year_from) : '',
    year_to: v.year_to != null ? String(v.year_to) : '',
    engine: v.engine ?? '',
  };
}

function yearRange(from: number | null, to: number | null) {
  if (from && to) return `${from}–${to}`;
  if (from) return `${from}+`;
  if (to) return `→${to}`;
  return null;
}

export function VehiclesClient({
  vehicles,
  makes: initialMakes,
  total,
}: {
  vehicles: VehicleRow[];
  makes: Make[];
  total: number;
}) {
  const [makes, setMakes] = useState<Make[]>(initialMakes);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<VehicleRow | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleCreate(values: VehicleInput) {
    const res = await createVehicle(values);
    if (!res.ok) {
      toast.error('Creazione fallita', { description: res.error });
      return false;
    }
    toast.success('Veicolo creato');
    return true;
  }

  async function handleEdit(values: VehicleInput) {
    if (!editing) return false;
    const res = await updateVehicle(editing.id, values);
    if (!res.ok) {
      toast.error('Aggiornamento fallito', { description: res.error });
      return false;
    }
    toast.success('Veicolo aggiornato');
    return true;
  }

  function handleDelete(v: VehicleRow) {
    if (!confirm(`Eliminare ${v.make_name} ${v.model}?`)) return;
    startTransition(async () => {
      const res = await deleteVehicle(v.id);
      if (!res.ok) {
        toast.error('Errore', {
          description: `${res.error} — potrebbero esserci compatibilità associate`,
        });
        return;
      }
      toast.success('Veicolo eliminato');
    });
  }

  return (
    <div>
      <PageHeader
        title="Veicoli"
        subtitle={
          total > 0
            ? `${total.toLocaleString('it-IT')} veicoli · ${makes.length} marche`
            : `Nessun veicolo ancora · ${makes.length} marche disponibili`
        }
        right={
          <StokuButton icon="plus" variant="primary" onClick={() => setCreating(true)}>
            Nuovo veicolo
          </StokuButton>
        }
      />

      <div style={{ padding: 24 }}>
        <Panel padded={false}>
          {vehicles.length === 0 ? (
            <Empty
              icon="car"
              title="Nessun veicolo"
              subtitle="Crea il primo veicolo per abilitare la gestione delle compatibilità."
              action={
                <StokuButton icon="plus" variant="primary" onClick={() => setCreating(true)}>
                  Crea veicolo
                </StokuButton>
              }
            />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 160 }}>Marca</th>
                  <th>Modello</th>
                  <th style={{ width: 120 }}>Telaio</th>
                  <th style={{ width: 120 }}>Anni</th>
                  <th style={{ width: 180 }}>Motore</th>
                  <th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => {
                  const years = yearRange(v.year_from, v.year_to);
                  return (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 500 }}>
                        {v.make_name ?? <span className="faint">—</span>}
                      </td>
                      <td className="truncate-1">
                        <Link
                          href={`/vehicles/${v.id}`}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          {v.model}
                        </Link>
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        {v.chassis_code ?? <span className="faint">—</span>}
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        {years ?? <span className="faint">—</span>}
                      </td>
                      <td className="truncate-1">
                        {v.engine ?? <span className="faint">—</span>}
                      </td>
                      <td>
                        <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn ghost sm"
                            style={{ width: 24, padding: 0, justifyContent: 'center' }}
                            onClick={() => setEditing(v)}
                            title="Modifica"
                            aria-label="Modifica"
                          >
                            <Icon name="edit" size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn ghost sm"
                            style={{ width: 24, padding: 0, justifyContent: 'center' }}
                            onClick={() => handleDelete(v)}
                            disabled={pending}
                            title="Elimina"
                            aria-label="Elimina"
                          >
                            <Icon name="trash" size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <VehicleFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSubmit={handleCreate}
        title="Nuovo veicolo"
        makes={makes}
        onMakeCreated={(m) => setMakes((prev) => [...prev, m].sort((a, b) => a.name.localeCompare(b.name)))}
      />
      {editing && (
        <VehicleFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          onSubmit={handleEdit}
          title={`Modifica ${editing.make_name ?? ''} ${editing.model}`}
          makes={makes}
          onMakeCreated={(m) => setMakes((prev) => [...prev, m].sort((a, b) => a.name.localeCompare(b.name)))}
          initial={toForm(editing)}
        />
      )}
    </div>
  );
}
