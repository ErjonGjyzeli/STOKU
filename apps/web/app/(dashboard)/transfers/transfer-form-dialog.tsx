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
import { createDraftTransfer } from './actions';

export type StoreOption = { id: number; code: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: StoreOption[];
  defaultFromStoreId: number | null;
};

export function TransferFormDialog({
  open,
  onOpenChange,
  stores,
  defaultFromStoreId,
}: Props) {
  const router = useRouter();
  const [fromId, setFromId] = useState<string>(
    defaultFromStoreId != null ? String(defaultFromStoreId) : '',
  );
  const [toId, setToId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- reset form on open */
  useEffect(() => {
    if (!open) return;
    setFromId(defaultFromStoreId != null ? String(defaultFromStoreId) : '');
    setToId('');
    setNotes('');
  }, [open, defaultFromStoreId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fromId || !toId) {
      toast.error('Seleziona origine e destinazione');
      return;
    }
    if (fromId === toId) {
      toast.error('Origine e destinazione devono essere diversi');
      return;
    }
    setSubmitting(true);
    const res = await createDraftTransfer({
      from_store_id: Number(fromId),
      to_store_id: Number(toId),
      notes,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error('Creazione fallita', { description: res.error });
      return;
    }
    toast.success('Bozza creata');
    onOpenChange(false);
    router.push(`/transfers/${res.data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuovo trasferimento</DialogTitle>
          <DialogDescription>
            Sposta stock tra punti vendita. Origine decrementata alla spedizione, destinazione
            incrementata alla ricezione.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label>Origine</Label>
              <Select value={fromId} onValueChange={(v) => setFromId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona" />
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
              <Label>Destinazione</Label>
              <Select value={toId} onValueChange={(v) => setToId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona" />
                </SelectTrigger>
                <SelectContent>
                  {stores
                    .filter((s) => String(s.id) !== fromId)
                    .map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.code} · {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label>Note</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="stoku-input"
              style={{ minHeight: 72, padding: 8, width: '100%', resize: 'vertical' }}
              rows={3}
              placeholder="Motivo trasferimento, tempistiche…"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={submitting || !fromId || !toId}>
              {submitting ? 'Creazione…' : 'Crea bozza'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
