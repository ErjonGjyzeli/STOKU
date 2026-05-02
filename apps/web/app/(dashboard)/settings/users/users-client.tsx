'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { StokuButton } from '@/components/ui/stoku-button';
import {
  createStaffUser,
  resetStaffPassword,
  updateStaffUser,
  type CreateUserInput,
  type UpdateUserInput,
} from './actions';
import { UserFormDialog } from './user-form-dialog';
import { PasswordResetDialog } from './password-reset-dialog';

export type Role = 'admin' | 'sales' | 'warehouse' | 'viewer';

export type StoreLite = { id: number; code: string; name: string };

export type StaffRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  is_active: boolean;
  created_at: string | null;
  store_ids: number[];
};

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  sales: 'Vendite',
  warehouse: 'Magazzino',
  viewer: 'Visualizzatore',
};

const ROLE_VARIANT: Record<Role, 'accent' | 'info' | 'ok' | 'draft'> = {
  admin: 'accent',
  sales: 'info',
  warehouse: 'ok',
  viewer: 'draft',
};

function initials(name: string | null, email: string | null) {
  const src = (name ?? email ?? '').trim();
  return (
    src
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '·'
  );
}

export function UsersClient({ staff, stores }: { staff: StaffRow[]; stores: StoreLite[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [resetting, setResetting] = useState<StaffRow | null>(null);

  async function handleCreate(values: CreateUserInput) {
    const res = await createStaffUser(values);
    if (!res.ok) {
      toast.error('Errore', { description: res.error });
      return false;
    }
    toast.success('Utente creato');
    return true;
  }

  async function handleUpdate(values: UpdateUserInput) {
    if (!editing) return false;
    const res = await updateStaffUser(editing.id, values);
    if (!res.ok) {
      toast.error('Errore', { description: res.error });
      return false;
    }
    toast.success('Utente aggiornato');
    return true;
  }

  async function handleReset(password: string) {
    if (!resetting) return false;
    const res = await resetStaffPassword(resetting.id, password);
    if (!res.ok) {
      toast.error('Errore', { description: res.error });
      return false;
    }
    toast.success('Password aggiornata');
    return true;
  }

  const storeByCode = new Map(stores.map((s) => [s.id, s]));

  return (
    <div>
      <PageHeader
        title="Utenti staff"
        subtitle={`${staff.length} utenti · Ruoli e accesso per punto vendita`}
        right={
          <StokuButton icon="plus" variant="primary" onClick={() => setCreating(true)}>
            Nuovo utente
          </StokuButton>
        }
      />

      <div style={{ padding: 24 }}>
        <Panel padded={false}>
          {staff.length === 0 ? (
            <Empty
              icon="users"
              title="Nessun utente staff"
              subtitle="Crea il primo utente per iniziare a lavorare."
              action={
                <StokuButton icon="plus" variant="primary" onClick={() => setCreating(true)}>
                  Crea utente
                </StokuButton>
              }
            />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Utente</th>
                  <th style={{ width: 220 }}>Email</th>
                  <th style={{ width: 140 }}>Ruolo</th>
                  <th>Punti vendita</th>
                  <th style={{ width: 100 }}>Stato</th>
                  <th style={{ width: 90 }} />
                </tr>
              </thead>
              <tbody>
                {staff.map((u) => (
                  <tr key={u.id} style={{ cursor: 'default' }}>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'var(--stoku-accent-bg)',
                            color: 'var(--stoku-accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          {initials(u.full_name, u.email)}
                        </div>
                        <span style={{ fontWeight: 500 }}>
                          {u.full_name ?? <span className="faint">—</span>}
                        </span>
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 10 }}>
                      {u.email ?? <span className="faint">—</span>}
                    </td>
                    <td>
                      <StokuBadge variant={ROLE_VARIANT[u.role]}>{ROLE_LABEL[u.role]}</StokuBadge>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 3, flexWrap: 'wrap' }}>
                        {u.role === 'admin' ? (
                          <StokuBadge variant="accent">Tutti</StokuBadge>
                        ) : u.store_ids.length === 0 ? (
                          <span className="faint">—</span>
                        ) : (
                          u.store_ids.map((id) => {
                            const s = storeByCode.get(id);
                            return <StokuBadge key={id}>{s?.code ?? id}</StokuBadge>;
                          })
                        )}
                      </div>
                    </td>
                    <td>
                      {u.is_active ? (
                        <StokuBadge variant="ok" dot>
                          Attivo
                        </StokuBadge>
                      ) : (
                        <StokuBadge variant="draft">Pasivo</StokuBadge>
                      )}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{ width: 24, padding: 0, justifyContent: 'center' }}
                          onClick={() => setEditing(u)}
                          title="Modifica"
                          aria-label="Modifica"
                        >
                          <Icon name="edit" size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{ width: 24, padding: 0, justifyContent: 'center' }}
                          onClick={() => setResetting(u)}
                          title="Reimposta password"
                          aria-label="Reimposta password"
                        >
                          <Icon name="lock" size={12} />
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

      <UserFormDialog
        mode="create"
        open={creating}
        onOpenChange={setCreating}
        stores={stores}
        onSubmitCreate={handleCreate}
        onSubmitUpdate={async () => false}
      />
      {editing && (
        <UserFormDialog
          mode="edit"
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          stores={stores}
          initial={{
            email: editing.email ?? '',
            full_name: editing.full_name ?? '',
            role: editing.role,
            is_active: editing.is_active,
            store_ids: editing.store_ids,
          }}
          onSubmitCreate={async () => false}
          onSubmitUpdate={handleUpdate}
        />
      )}
      {resetting && (
        <PasswordResetDialog
          user={resetting}
          open={!!resetting}
          onOpenChange={(o) => !o && setResetting(null)}
          onSubmit={handleReset}
        />
      )}
    </div>
  );
}
