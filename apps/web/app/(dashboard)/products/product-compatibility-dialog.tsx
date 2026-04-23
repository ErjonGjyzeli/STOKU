'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { setProductCompatibility } from './actions';

export type CompatVehicle = {
  id: number;
  make_name: string | null;
  model: string;
  chassis_code: string | null;
  year_from: number | null;
  year_to: number | null;
  engine: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productSku: string;
  allVehicles: CompatVehicle[];
  initialSelected: number[];
  onSaved: (selected: number[]) => void;
};

function vehicleLabel(v: CompatVehicle) {
  const years =
    v.year_from && v.year_to
      ? ` ${v.year_from}–${v.year_to}`
      : v.year_from
        ? ` ${v.year_from}+`
        : v.year_to
          ? ` →${v.year_to}`
          : '';
  const chassis = v.chassis_code ? ` [${v.chassis_code}]` : '';
  const engine = v.engine ? ` · ${v.engine}` : '';
  return `${v.make_name ?? '?'} ${v.model}${chassis}${years}${engine}`;
}

export function ProductCompatibilityDialog({
  open,
  onOpenChange,
  productId,
  productSku,
  allVehicles,
  initialSelected,
  onSaved,
}: Props) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(initialSelected));
  const [filter, setFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return allVehicles;
    return allVehicles.filter((v) => {
      const hay = [
        v.make_name,
        v.model,
        v.chassis_code,
        v.engine,
        v.year_from,
        v.year_to,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [filter, allVehicles]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSubmitting(true);
    const ids = Array.from(selected);
    const res = await setProductCompatibility(productId, ids);
    setSubmitting(false);
    if (!res.ok) {
      toast.error('Salvataggio fallito', { description: res.error });
      return;
    }
    toast.success(
      ids.length === 0
        ? 'Compatibilità rimossa'
        : `${ids.length} veicol${ids.length === 1 ? 'o' : 'i'} salvat${ids.length === 1 ? 'o' : 'i'}`,
    );
    onSaved(ids);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Compatibilità {productSku}</DialogTitle>
          <DialogDescription>
            Seleziona i veicoli su cui monta questo ricambio. Il salvataggio sostituisce
            l&apos;elenco precedente.
          </DialogDescription>
        </DialogHeader>

        <div className="col" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <Icon name="search" size={13} />
            <Input
              placeholder="Filtra per marca, modello, anno, telaio, motore"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <span className="meta" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
              {selected.size}/{allVehicles.length} · {filtered.length} visibili
            </span>
          </div>

          <div
            style={{
              maxHeight: 360,
              overflow: 'auto',
              border: '1px solid var(--stoku-border)',
              borderRadius: 'var(--r-md)',
            }}
          >
            {filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)' }}>
                Nessun veicolo {filter ? 'corrispondente' : 'disponibile'}
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {filtered.map((v) => {
                  const checked = selected.has(v.id);
                  return (
                    <li
                      key={v.id}
                      style={{ borderBottom: '1px solid var(--stoku-border)' }}
                    >
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 12px',
                          cursor: 'pointer',
                          background: checked ? 'var(--stoku-accent-bg-weak)' : undefined,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(v.id)}
                        />
                        <span style={{ fontSize: 13 }}>{vehicleLabel(v)}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button type="button" onClick={handleSave} disabled={submitting}>
            {submitting ? 'Salvataggio…' : `Salva (${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
