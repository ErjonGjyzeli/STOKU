'use client';

import { Pencil, Plus, Power } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Punti vendita</h1>
          <p className="text-muted-foreground">Gestisci negozi e magazzini.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Nuovo
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {s.code}
                <Badge variant={s.is_active ? 'default' : 'secondary'}>
                  {s.is_active ? 'Attivo' : 'Disattivato'}
                </Badge>
              </CardTitle>
              <CardDescription>{s.name}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo: </span>
                {TYPE_LABEL[s.type] ?? s.type}
              </div>
              {(s.city || s.country) && (
                <div>
                  <span className="text-muted-foreground">Città: </span>
                  {[s.city, s.country].filter(Boolean).join(', ')}
                </div>
              )}
              {s.phone && (
                <div>
                  <span className="text-muted-foreground">Tel: </span>
                  {s.phone}
                </div>
              )}
              {s.email && (
                <div className="truncate">
                  <span className="text-muted-foreground">Email: </span>
                  {s.email}
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                  <Pencil /> Modifica
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggle(s)}
                  disabled={pending}
                >
                  <Power /> {s.is_active ? 'Disattiva' : 'Attiva'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
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
