'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createDraftOrder } from './actions';

export type CustomerOption = { id: string; code: string | null; name: string };
export type StoreOption = { id: number; code: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: CustomerOption[];
  stores: StoreOption[];
  defaultStoreId: number | null;
};

const COUNTER_SENTINEL_NONE = '_none';

export function OrderFormDialog({
  open,
  onOpenChange,
  customers,
  stores,
  defaultStoreId,
}: Props) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string>(COUNTER_SENTINEL_NONE);
  const [storeId, setStoreId] = useState<string>(
    defaultStoreId != null ? String(defaultStoreId) : '',
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- reset form on open */
  useEffect(() => {
    if (!open) return;
    setCustomerId(COUNTER_SENTINEL_NONE);
    setStoreId(defaultStoreId != null ? String(defaultStoreId) : '');
    setNotes('');
  }, [open, defaultStoreId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!storeId) {
      toast.error('Seleziona un punto vendita');
      return;
    }
    setSubmitting(true);
    const res = await createDraftOrder({
      customer_id: customerId !== COUNTER_SENTINEL_NONE ? customerId : null,
      store_id: Number(storeId),
      notes,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error('Creazione fallita', { description: res.error });
      return;
    }
    toast.success('Bozza creata');
    onOpenChange(false);
    router.push(`/orders/${res.data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuovo ordine</DialogTitle>
          <DialogDescription>
            Crea una bozza. Gli articoli si aggiungono nel dettaglio con reserve stock
            automatica.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>Cliente (opzionale — vendita banco se vuoto)</Label>
            <Select value={customerId} onValueChange={(v) => setCustomerId(v ?? COUNTER_SENTINEL_NONE)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={COUNTER_SENTINEL_NONE}>— Vendita banco</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code ? `${c.code} · ${c.name}` : c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label>Punto vendita</Label>
            <Select value={storeId} onValueChange={(v) => setStoreId(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona store" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.code} · {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label>Note interne (opzionale)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="stoku-input"
              style={{ minHeight: 72, padding: 8, width: '100%', resize: 'vertical' }}
              rows={3}
              placeholder="Specifiche tecniche, richieste, reminder…"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={submitting || !storeId}>
              {submitting ? 'Creazione…' : 'Crea bozza'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
