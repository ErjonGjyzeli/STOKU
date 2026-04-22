'use client';

import { useSyncExternalStore } from 'react';
import { useStoreContext } from '@/lib/context/store-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StoreLite } from '@/lib/auth/session';

const STORAGE_KEY = 'stoku:active-store';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

function readSaved() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? Number(raw) : null;
}

export function StoreSwitcher({ stores }: { stores: StoreLite[] }) {
  const { activeStoreId, setActiveStoreId } = useStoreContext();
  const savedId = useSyncExternalStore(subscribe, readSaved, () => null);

  if (stores.length === 0) {
    return <span className="text-muted-foreground text-sm">Nessun punto vendita</span>;
  }

  const fallback = stores[0].id;
  const effective =
    activeStoreId ??
    (savedId != null && stores.some((s) => s.id === savedId) ? savedId : fallback);

  function handleChange(v: string | null) {
    if (v == null) return;
    const id = Number(v);
    setActiveStoreId(id);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, String(id));
  }

  return (
    <Select value={String(effective)} onValueChange={handleChange}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Seleziona punto vendita" />
      </SelectTrigger>
      <SelectContent>
        {stores.map((s) => (
          <SelectItem key={s.id} value={String(s.id)}>
            <span className="font-medium">{s.code}</span>
            <span className="text-muted-foreground ml-2">{s.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
