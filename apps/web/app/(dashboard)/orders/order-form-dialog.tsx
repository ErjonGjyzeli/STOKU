'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';

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
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);
  const [storeId, setStoreId] = useState<string>(
    defaultStoreId != null ? String(defaultStoreId) : '',
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- reset form on open */
  useEffect(() => {
    if (!open) return;
    setCustomerId(COUNTER_SENTINEL_NONE);
    setCustomerSearch('');
    setCustomerOpen(false);
    setStoreId(defaultStoreId != null ? String(defaultStoreId) : '');
    setNotes('');
  }, [open, defaultStoreId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!customerOpen) return;
    function handleClick(e: MouseEvent) {
      if (!customerRef.current?.contains(e.target as Node)) {
        setCustomerOpen(false);
        setCustomerSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [customerOpen]);

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const customerLabel =
    customerId === COUNTER_SENTINEL_NONE
      ? 'Shitje banaku'
      : selectedCustomer
        ? selectedCustomer.code
          ? `${selectedCustomer.code} · ${selectedCustomer.name}`
          : selectedCustomer.name
        : 'Shitje banaku';

  const filteredCustomers = customerSearch
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          (c.code?.toLowerCase().includes(customerSearch.toLowerCase()) ?? false),
      )
    : customers;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!storeId) {
      toast.error('Zgjidh një pikë shitjeje');
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
      toast.error('Krijimi dështoi', { description: res.error });
      return;
    }
    toast.success('Drafti u krijua');
    onOpenChange(false);
    router.push(`/orders/${res.data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Porosi e re</DialogTitle>
          <DialogDescription>
            Krijo një draft. Artikujt shtohen në detaje me rezervim automatik stoku.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>Klienti (opsional — shitje banaku nëse bosh)</Label>
            <div ref={customerRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setCustomerOpen((v) => !v)}
                className="stoku-input"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: 32,
                  padding: '0 10px',
                  gap: 8,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {customerLabel}
                </span>
                <ChevronDown size={14} style={{ flexShrink: 0 }} />
              </button>
              {customerOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    background: 'var(--panel)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--r-md)',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  }}
                >
                  <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--stoku-border)' }}>
                    <input
                      autoFocus
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Kërko klient…"
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: 11,
                        color: 'inherit',
                      }}
                    />
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerId(COUNTER_SENTINEL_NONE);
                        setCustomerOpen(false);
                        setCustomerSearch('');
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '7px 10px',
                        fontSize: 11,
                        background: customerId === COUNTER_SENTINEL_NONE ? 'var(--accent)' : 'transparent',
                        cursor: 'pointer',
                        display: 'block',
                        border: 'none',
                        color: 'inherit',
                      }}
                    >
                      Shitje banaku
                    </button>
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCustomerId(c.id);
                          setCustomerOpen(false);
                          setCustomerSearch('');
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '7px 10px',
                          fontSize: 11,
                          background: customerId === c.id ? 'var(--accent)' : 'transparent',
                          cursor: 'pointer',
                          display: 'block',
                          border: 'none',
                          color: 'inherit',
                        }}
                      >
                        {c.code ? `${c.code} · ${c.name}` : c.name}
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <div style={{ padding: '7px 10px', fontSize: 11, color: 'var(--muted-foreground)' }}>
                        Asnjë klient i gjetur
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label>Pika e shitjes</Label>
            <Select value={storeId} onValueChange={(v) => setStoreId(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Zgjidh pikën" />
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
            <Label>Shënime interne (opsionale)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="stoku-input"
              style={{ minHeight: 72, padding: 8, width: '100%', resize: 'vertical' }}
              rows={3}
              placeholder="Specifika teknike, kërkesa, kujtues…"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Anulo
            </Button>
            <Button type="submit" disabled={submitting || !storeId}>
              {submitting ? 'Duke krijuar…' : 'Krijo draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
