'use client';

import { KeyRound, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Utenti staff</h1>
          <p className="text-muted-foreground">Gestisci account e permessi.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Nuovo
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <Th>Nome</Th>
                  <Th>Email</Th>
                  <Th>Ruolo</Th>
                  <Th>Stato</Th>
                  <Th>Punti vendita</Th>
                  <Th className="text-right">Azioni</Th>
                </tr>
              </thead>
              <tbody>
                {staff.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <Td className="font-medium">{u.full_name ?? '—'}</Td>
                    <Td className="text-muted-foreground">{u.email}</Td>
                    <Td>
                      <Badge variant="secondary">{ROLE_LABEL[u.role]}</Badge>
                    </Td>
                    <Td>
                      <Badge variant={u.is_active ? 'default' : 'secondary'}>
                        {u.is_active ? 'Attivo' : 'Disattivato'}
                      </Badge>
                    </Td>
                    <Td className="text-muted-foreground text-xs">
                      {u.role === 'admin'
                        ? 'Tutti'
                        : u.store_ids.length
                          ? stores
                              .filter((s) => u.store_ids.includes(s.id))
                              .map((s) => s.code)
                              .join(', ')
                          : '—'}
                    </Td>
                    <Td className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditing(u)}>
                        <Pencil /> Modifica
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setResetting(u)}>
                        <KeyRound /> Password
                      </Button>
                    </Td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground p-6 text-center">
                      Nessun utente staff registrato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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

function Th({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <th
      className={`text-muted-foreground px-4 py-3 text-xs font-medium uppercase ${className ?? ''}`}
    >
      {children}
    </th>
  );
}

function Td({ className, children }: { className?: string; children: React.ReactNode }) {
  return <td className={`px-4 py-3 ${className ?? ''}`}>{children}</td>;
}
