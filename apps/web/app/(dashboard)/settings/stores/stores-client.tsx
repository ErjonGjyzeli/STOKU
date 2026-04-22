'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { StokuButton } from '@/components/ui/stoku-button';
import { createStore, toggleStoreActive, updateStore, type StoreInput } from './actions';
import { StoreFormDialog } from './store-form-dialog';

type StoreRow = {
  id: number;
  code: string;
  name: string;
  type: string;
  city: string | null;
  country: string | null;
  address_line1: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean | null;
};

const TYPE_LABEL: Record<string, string> = {
  shop: 'Negozio',
  warehouse: 'Magazzino',
  mixed: 'Misto',
};

export function StoresClient({ stores }: { stores: StoreRow[] }) {
  const [editing, setEditing] = useState<StoreRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleToggle(store: StoreRow) {
    startTransition(async () => {
      const res = await toggleStoreActive(store.id, !store.is_active);
      if (!res.ok) toast.error('Errore', { description: res.error });
      else toast.success(store.is_active ? 'Disattivato' : 'Attivato');
    });
  }

  async function handleSubmit(values: StoreInput, id?: number) {
    const res = id ? await updateStore(id, values) : await createStore(values);
    if (!res.ok) {
      toast.error('Errore', { description: res.error });
      return false;
    }
    toast.success(id ? 'Punto vendita aggiornato' : 'Punto vendita creato');
    return true;
  }

  return (
    <div>
      <PageHeader
        title="Punti vendita"
        subtitle={`${stores.length} configurati · Negozi, magazzini e punti misti`}
        right={
          <StokuButton icon="plus" variant="primary" onClick={() => setCreating(true)}>
            Nuovo punto
          </StokuButton>
        }
      />

      <div style={{ padding: 24 }}>
        <Panel padded={false}>
          {stores.length === 0 ? (
            <Empty
              icon="store"
              title="Nessun punto vendita"
              subtitle="Crea il primo punto vendita per iniziare."
              action={
                <StokuButton icon="plus" variant="primary" onClick={() => setCreating(true)}>
                  Crea punto vendita
                </StokuButton>
              }
            />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Codice</th>
                  <th>Nome</th>
                  <th style={{ width: 140 }}>Città</th>
                  <th style={{ width: 140 }}>Tipo</th>
                  <th style={{ width: 110 }}>Stato</th>
                  <th style={{ width: 160 }}>Telefono</th>
                  <th style={{ width: 90 }} />
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr key={store.id} style={{ cursor: 'default' }}>
                    <td className="mono" style={{ fontWeight: 500 }}>
                      {store.code}
                    </td>
                    <td className="truncate-1">{store.name}</td>
                    <td>
                      {[store.city, store.country].filter(Boolean).join(', ') || (
                        <span className="faint">—</span>
                      )}
                    </td>
                    <td>
                      <StokuBadge>{TYPE_LABEL[store.type] ?? store.type}</StokuBadge>
                    </td>
                    <td>
                      {store.is_active ? (
                        <StokuBadge variant="ok" dot>
                          Attivo
                        </StokuBadge>
                      ) : (
                        <StokuBadge variant="draft">Disattivato</StokuBadge>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {store.phone ?? <span className="faint">—</span>}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{ width: 24, padding: 0, justifyContent: 'center' }}
                          onClick={() => setEditing(store)}
                          title="Modifica"
                          aria-label="Modifica"
                        >
                          <Icon name="edit" size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{ width: 24, padding: 0, justifyContent: 'center' }}
                          onClick={() => handleToggle(store)}
                          disabled={pending}
                          title={store.is_active ? 'Disattiva' : 'Attiva'}
                          aria-label={store.is_active ? 'Disattiva' : 'Attiva'}
                        >
                          <Icon name="ring" size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <StoreFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSubmit={handleSubmit}
        title="Nuovo punto vendita"
      />
      {editing && (
        <StoreFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          onSubmit={(values) => handleSubmit(values, editing.id)}
          title={`Modifica ${editing.code}`}
          initial={{
            code: editing.code,
            name: editing.name,
            type: editing.type as StoreInput['type'],
            city: editing.city,
            country: editing.country,
            address_line1: editing.address_line1,
            postal_code: editing.postal_code,
            phone: editing.phone,
            email: editing.email,
          }}
        />
      )}
    </div>
  );
}
