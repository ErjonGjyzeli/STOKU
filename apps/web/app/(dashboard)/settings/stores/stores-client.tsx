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
  shop: 'Dyqan',
  warehouse: 'Magazina',
  mixed: 'Miks',
};

export function StoresClient({ stores }: { stores: StoreRow[] }) {
  const [editing, setEditing] = useState<StoreRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleToggle(store: StoreRow) {
    startTransition(async () => {
      const res = await toggleStoreActive(store.id, !store.is_active);
      if (!res.ok) toast.error('Gabim', { description: res.error });
      else toast.success(store.is_active ? 'Çaktivizuar' : 'Aktivizuar');
    });
  }

  async function handleSubmit(values: StoreInput, id?: number) {
    const res = id ? await updateStore(id, values) : await createStore(values);
    if (!res.ok) {
      toast.error('Gabim', { description: res.error });
      return false;
    }
    toast.success(id ? 'Pika e shitjes u përditësua' : 'Pika e shitjes u krijua');
    return true;
  }

  return (
    <div>
      <PageHeader
        title="Pikat e shitjes"
        subtitle={`${stores.length} të konfiguruara · Dyqane, magazina dhe pika miks`}
        right={
          <StokuButton icon="plus" variant="primary" onClick={() => setCreating(true)}>
            Pikë e re
          </StokuButton>
        }
      />

      <div style={{ padding: 24 }}>
        <Panel padded={false}>
          {stores.length === 0 ? (
            <Empty
              icon="store"
              title="Asnjë pikë shitjeje"
              subtitle="Krijo pikën e parë të shitjes për të filluar."
              action={
                <StokuButton icon="plus" variant="primary" onClick={() => setCreating(true)}>
                  Krijo
                </StokuButton>
              }
            />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Kodi</th>
                  <th>Emri</th>
                  <th style={{ width: 140 }}>Qyteti</th>
                  <th style={{ width: 140 }}>Tipi</th>
                  <th style={{ width: 110 }}>Statusi</th>
                  <th style={{ width: 160 }}>Telefoni</th>
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
                          Aktiv
                        </StokuBadge>
                      ) : (
                        <StokuBadge variant="draft">Çaktivizuar</StokuBadge>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 10 }}>
                      {store.phone ?? <span className="faint">—</span>}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{ width: 24, padding: 0, justifyContent: 'center' }}
                          onClick={() => setEditing(store)}
                          title="Modifiko"
                          aria-label="Modifiko"
                        >
                          <Icon name="edit" size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{ width: 24, padding: 0, justifyContent: 'center' }}
                          onClick={() => handleToggle(store)}
                          disabled={pending}
                          title={store.is_active ? 'Çaktivizo' : 'Aktivo'}
                          aria-label={store.is_active ? 'Çaktivizo' : 'Aktivo'}
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
        title="Pikë e re shitjeje"
      />
      {editing && (
        <StoreFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          onSubmit={(values) => handleSubmit(values, editing.id)}
          title={`Modifiko ${editing.code}`}
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
