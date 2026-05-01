'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { StokuButton } from '@/components/ui/stoku-button';
import { createShelf, toggleShelfActive, updateShelf, type ShelfInput } from './actions';
import { ShelfFormDialog } from './shelf-form-dialog';

export type ShelfRow = {
  id: string;
  code: string;
  description: string | null;
  kind: 'open' | 'cabinet' | 'drawer' | 'floor';
  capacity: number | null;
  is_active: boolean;
  store_id: number;
  store_code: string | null;
  store_name: string | null;
  unique_products: number;
  total_pieces: number;
};

type StoreOption = { id: number; code: string; name: string };

const KIND_LABEL: Record<ShelfRow['kind'], string> = {
  open: 'Aperto',
  cabinet: 'Armadio',
  drawer: 'Cassettiera',
  floor: 'Pavimento',
};

function fillPercent(used: number, capacity: number | null) {
  if (!capacity || capacity <= 0) return null;
  return Math.min(100, Math.round((used / capacity) * 100));
}

function fillColor(percent: number | null) {
  if (percent === null) return undefined;
  if (percent >= 90) return 'var(--danger)';
  if (percent >= 70) return 'var(--warn)';
  return undefined;
}

type Props = {
  shelves: ShelfRow[];
  showStoreColumn: boolean;
  hasFilters: boolean;
  stores: StoreOption[];
  defaultStoreId: number | null;
  canWrite: boolean;
};

export function ShelvesClient({
  shelves,
  showStoreColumn,
  hasFilters,
  stores,
  defaultStoreId,
  canWrite,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ShelfRow | null>(null);
  const [pending, startTransition] = useTransition();

  function handleToggle(shelf: ShelfRow) {
    startTransition(async () => {
      const res = await toggleShelfActive(shelf.id, !shelf.is_active);
      if (!res.ok) toast.error('Errore', { description: res.error });
      else toast.success(shelf.is_active ? 'Disattivato' : 'Attivato');
    });
  }

  async function handleSubmit(values: ShelfInput, id?: string) {
    const res = id ? await updateShelf(id, values) : await createShelf(values);
    if (!res.ok) {
      toast.error('Errore', { description: res.error });
      return false;
    }
    toast.success(id ? 'Scaffale aggiornato' : 'Scaffale creato');
    return true;
  }

  return (
    <>
      <Panel padded={false}>
        {shelves.length === 0 ? (
          <Empty
            icon="shelves"
            title={hasFilters ? 'Nessuno scaffale trovato' : 'Nessuno scaffale'}
            subtitle={
              hasFilters
                ? 'Prova a resettare i filtri.'
                : 'Crea il primo scaffale per mappare la collocazione fisica dei prodotti.'
            }
            action={
              !hasFilters && canWrite && stores.length > 0 ? (
                <StokuButton icon="plus" variant="primary" onClick={() => setCreating(true)}>
                  Crea scaffale
                </StokuButton>
              ) : undefined
            }
          />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                {showStoreColumn && <th style={{ width: 90 }}>PV</th>}
                <th style={{ width: 160 }}>Codice</th>
                <th>Descrizione</th>
                <th style={{ width: 120 }}>Tipo</th>
                <th style={{ width: 90, textAlign: 'right' }}>Prodotti</th>
                <th style={{ width: 90, textAlign: 'right' }}>Pezzi</th>
                <th style={{ width: 90, textAlign: 'right' }}>Cap.</th>
                <th style={{ width: 110 }}>Riempimento</th>
                <th style={{ width: 100 }}>Stato</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {shelves.map((s) => {
                const percent = fillPercent(s.total_pieces, s.capacity);
                return (
                  <tr key={s.id}>
                    {showStoreColumn && (
                      <td className="mono" style={{ fontSize: 11, fontWeight: 500 }}>
                        {s.store_code ?? <span className="faint">—</span>}
                      </td>
                    )}
                    <td className="mono" style={{ fontWeight: 500 }}>
                      <Link
                        href={`/shelves/${s.id}`}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        {s.code}
                      </Link>
                    </td>
                    <td className="truncate-1">
                      {s.description ?? <span className="faint">—</span>}
                    </td>
                    <td>
                      <StokuBadge>{KIND_LABEL[s.kind]}</StokuBadge>
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {s.unique_products}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {s.total_pieces}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {s.capacity ?? <span className="faint">—</span>}
                    </td>
                    <td>
                      {percent === null ? (
                        <span className="faint">—</span>
                      ) : (
                        <span
                          className="mono"
                          style={{ fontSize: 11, color: fillColor(percent) }}
                        >
                          {percent}%
                        </span>
                      )}
                    </td>
                    <td>
                      {s.is_active ? (
                        <StokuBadge variant="ok" dot>
                          Attivo
                        </StokuBadge>
                      ) : (
                        <StokuBadge variant="draft">Disattivato</StokuBadge>
                      )}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        {canWrite && (
                          <>
                            <button
                              type="button"
                              className="btn ghost sm"
                              style={{ width: 24, padding: 0, justifyContent: 'center' }}
                              onClick={() => setEditing(s)}
                              title="Modifica"
                              aria-label="Modifica"
                            >
                              <Icon name="edit" size={12} />
                            </button>
                            <button
                              type="button"
                              className="btn ghost sm"
                              style={{ width: 24, padding: 0, justifyContent: 'center' }}
                              onClick={() => handleToggle(s)}
                              disabled={pending}
                              title={s.is_active ? 'Disattiva' : 'Attiva'}
                              aria-label={s.is_active ? 'Disattiva' : 'Attiva'}
                            >
                              <Icon name="ring" size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      {canWrite && (
        <ShelfFormDialog
          open={creating}
          onOpenChange={setCreating}
          onSubmit={(values) => handleSubmit(values)}
          title="Nuovo scaffale"
          stores={stores}
          defaultStoreId={defaultStoreId}
        />
      )}
      {canWrite && editing && (
        <ShelfFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          onSubmit={(values) => handleSubmit(values, editing.id)}
          title={`Modifica ${editing.code}`}
          stores={stores}
          defaultStoreId={editing.store_id}
          initial={{
            code: editing.code,
            store_id: editing.store_id,
            description: editing.description ?? '',
            kind: editing.kind,
            capacity: editing.capacity,
            is_active: editing.is_active,
          }}
        />
      )}
    </>
  );
}
