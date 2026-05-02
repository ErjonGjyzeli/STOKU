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
  deleteStaffUser,
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
  sales: 'Shitje',
  warehouse: 'Magazina',
  viewer: 'Vëzhgues',
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate(values: CreateUserInput) {
    const res = await createStaffUser(values);
    if (!res.ok) {
      toast.error('Gabim', { description: res.error });
      return false;
    }
    toast.success('Përdoruesi u krijua');
    return true;
  }

  async function handleUpdate(values: UpdateUserInput) {
    if (!editing) return false;
    const res = await updateStaffUser(editing.id, values);
    if (!res.ok) {
      toast.error('Gabim', { description: res.error });
      return false;
    }
    toast.success('Përdoruesi u përditësua');
    return true;
  }

  async function handleReset(password: string) {
    if (!resetting) return false;
    const res = await resetStaffPassword(resetting.id, password);
    if (!res.ok) {
      toast.error('Gabim', { description: res.error });
      return false;
    }
    toast.success('Fjalëkalimi u përditësua');
    return true;
  }

  async function handleDelete(id: string) {
    const res = await deleteStaffUser(id);
    if (!res.ok) {
      toast.error('Gabim', { description: res.error });
    } else {
      toast.success('Përdoruesi u fshi');
    }
    setDeletingId(null);
  }

  const storeByCode = new Map(stores.map((s) => [s.id, s]));

  return (
    <div>
      <PageHeader
        title="Stafi"
        subtitle={`${staff.length} anëtarë · Rolet dhe qasja për pikë shitjeje`}
        right={
          <StokuButton icon="plus" variant="primary" onClick={() => setCreating(true)}>
            Përdorues i ri
          </StokuButton>
        }
      />

      <div style={{ padding: 24 }}>
        <Panel padded={false}>
          {staff.length === 0 ? (
            <Empty
              icon="users"
              title="Asnjë anëtar stafi"
              subtitle="Krijo përdoruesin e parë për të filluar punën."
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
                  <th>Përdoruesi</th>
                  <th style={{ width: 220 }}>Email</th>
                  <th style={{ width: 140 }}>Roli</th>
                  <th>Pikat e shitjes</th>
                  <th style={{ width: 100 }}>Statusi</th>
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
                          <StokuBadge variant="accent">Të gjitha</StokuBadge>
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
                          Aktiv
                        </StokuBadge>
                      ) : (
                        <StokuBadge variant="draft">Pasiv</StokuBadge>
                      )}
                    </td>
                    <td>
                      {deletingId === u.id ? (
                        <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn danger sm"
                            style={{ fontSize: 10 }}
                            onClick={() => handleDelete(u.id)}
                          >
                            Konfirmo
                          </button>
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => setDeletingId(null)}
                          >
                            Anulo
                          </button>
                        </div>
                      ) : (
                        <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn ghost sm"
                            style={{ width: 24, padding: 0, justifyContent: 'center' }}
                            onClick={() => setEditing(u)}
                            title="Modifiko"
                            aria-label="Modifiko"
                          >
                            <Icon name="edit" size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn ghost sm"
                            style={{ width: 24, padding: 0, justifyContent: 'center' }}
                            onClick={() => setResetting(u)}
                            title="Rivendos fjalëkalimin"
                            aria-label="Rivendos fjalëkalimin"
                          >
                            <Icon name="lock" size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn ghost sm danger"
                            style={{ width: 24, padding: 0, justifyContent: 'center' }}
                            onClick={() => setDeletingId(u.id)}
                            title="Fshi përdoruesin"
                            aria-label="Fshi përdoruesin"
                          >
                            <Icon name="trash" size={12} />
                          </button>
                        </div>
                      )}
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
