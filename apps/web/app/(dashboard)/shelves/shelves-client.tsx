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
  open: 'I hapur',
  cabinet: 'Kabineti',
  drawer: 'Sirtarët',
  floor: 'Dyshemeja',
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
      if (!res.ok) toast.error('Gabim', { description: res.error });
      else toast.success(shelf.is_active ? 'Çaktivizuar' : 'Aktivizuar');
    });
  }

  async function handleSubmit(values: ShelfInput, id?: string) {
    const res = id ? await updateShelf(id, values) : await createShelf(values);
    if (!res.ok) {
      toast.error('Gabim', { description: res.error });
      return false;
    }
    toast.success(id ? 'Rafti u përditësua' : 'Rafti u krijua');
    return true;
  }

  return (
    <>
      <Panel padded={false}>
        {shelves.length === 0 ? (
          <Empty
            icon="shelves"
            title={hasFilters ? 'Asnjë raft i gjetur' : 'Asnjë raft'}
            subtitle={
              hasFilters
                ? 'Provo të rivendosësh filtrat.'
                : 'Krijo raftin e parë për të hartuar vendndodhjen fizike të produkteve.'
            }
            action={
              !hasFilters && canWrite && stores.length > 0 ? (
                <StokuButton icon="plus" variant="primary" onClick={() => setCreating(true)}>
                  Krijo raft
                </StokuButton>
              ) : undefined
            }
          />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                {showStoreColumn && <th style={{ width: 90 }}>PV</th>}
                <th style={{ width: 160 }}>Kodi</th>
                <th>Përshkrimi</th>
                <th style={{ width: 120 }}>Tipi</th>
                <th style={{ width: 90, textAlign: 'right' }}>Produkte</th>
                <th style={{ width: 90, textAlign: 'right' }}>Copë</th>
                <th style={{ width: 90, textAlign: 'right' }}>Cap.</th>
                <th style={{ width: 110 }}>Mbushja</th>
                <th style={{ width: 100 }}>Statusi</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {shelves.map((s) => {
                const percent = fillPercent(s.total_pieces, s.capacity);
                return (
                  <tr key={s.id}>
                    {showStoreColumn && (
                      <td className="mono" style={{ fontSize: 10, fontWeight: 500 }}>
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
                          style={{ fontSize: 10, color: fillColor(percent) }}
                        >
                          {percent}%
                        </span>
                      )}
                    </td>
                    <td>
                      {s.is_active ? (
                        <StokuBadge variant="ok" dot>
                          Aktiv
                        </StokuBadge>
                      ) : (
                        <StokuBadge variant="draft">Çaktivizuar</StokuBadge>
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
                              title="Modifiko"
                              aria-label="Modifiko"
                            >
                              <Icon name="edit" size={12} />
                            </button>
                            <button
                              type="button"
                              className="btn ghost sm"
                              style={{ width: 24, padding: 0, justifyContent: 'center' }}
                              onClick={() => handleToggle(s)}
                              disabled={pending}
                              title={s.is_active ? 'Çaktivizo' : 'Aktivo'}
                              aria-label={s.is_active ? 'Çaktivizo' : 'Aktivo'}
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
          title="Raft i ri"
          stores={stores}
          defaultStoreId={defaultStoreId}
        />
      )}
      {canWrite && editing && (
        <ShelfFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          onSubmit={(values) => handleSubmit(values, editing.id)}
          title={`Modifiko ${editing.code}`}
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
