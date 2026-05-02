'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import {
  addTransferItem,
  removeTransferItem,
  setItemQuantityReceived,
  transitionTransferStatus,
} from '../actions';
import {
  allowedNextStatuses,
  STATUS_ACTION_LABEL,
  STATUS_LABEL,
  type TransferTransitionStatus,
} from '../status';

type BadgeVariant = 'default' | 'ok' | 'warn' | 'danger' | 'info' | 'draft' | 'accent';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'draft',
  in_transit: 'accent',
  completed: 'ok',
  cancelled: 'danger',
};

export type TransferItemRow = {
  id: string;
  product_id: string | null;
  sku: string;
  name: string;
  quantity: number;
  quantity_received: number | null;
};

export type TransferSummary = {
  id: string;
  transfer_number: string;
  status: string;
  from_store_id: number;
};

export type ProductOption = {
  id: string;
  sku: string;
  name: string;
};

type Props = {
  transfer: TransferSummary;
  items: TransferItemRow[];
  products: ProductOption[];
};

export function TransferDetailClient({ transfer, items, products }: Props) {
  const [productQuery, setProductQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = productQuery.toLowerCase().trim();
    if (!q) return products.slice(0, 20);
    return products
      .filter((p) => `${p.sku} ${p.name}`.toLowerCase().includes(q))
      .slice(0, 20);
  }, [productQuery, products]);

  const isDraft = transfer.status === 'draft';
  const isInTransit = transfer.status === 'in_transit';
  const nextStatuses = allowedNextStatuses(transfer.status);

  async function handleAdd() {
    if (!selectedProductId) {
      toast.error('Seleziona un prodotto');
      return;
    }
    const qtyNum = Number(qty);
    if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
      toast.error('Quantità deve essere intero > 0');
      return;
    }
    setSubmitting(true);
    const res = await addTransferItem({
      transfer_id: transfer.id,
      product_id: selectedProductId,
      quantity: qtyNum,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error('Aggiunta fallita', { description: res.error });
      return;
    }
    toast.success('Riga aggiunta');
    setSelectedProductId('');
    setProductQuery('');
    setQty('1');
  }

  function handleRemove(itemId: string) {
    if (!confirm('Rimuovere la riga?')) return;
    startTransition(async () => {
      const res = await removeTransferItem(transfer.id, itemId);
      if (!res.ok) {
        toast.error('Errore', { description: res.error });
        return;
      }
      toast.success('Riga rimossa');
    });
  }

  function handleTransition(next: TransferTransitionStatus) {
    const msg =
      next === 'cancelled'
        ? `Annullare trasferimento ${transfer.transfer_number}?`
        : `${STATUS_ACTION_LABEL[next] ?? next}?`;
    if (!confirm(msg)) return;
    startTransition(async () => {
      const res = await transitionTransferStatus({
        transfer_id: transfer.id,
        new_status: next,
      });
      if (!res.ok) {
        toast.error('Transizione fallita', { description: res.error });
        return;
      }
      toast.success(`→ ${STATUS_LABEL[next] ?? next}`);
    });
  }

  function handleReceivedChange(itemId: string, raw: string) {
    const qtyNum = Number(raw);
    if (!Number.isInteger(qtyNum) || qtyNum < 0) {
      toast.error('Quantità ricevuta non valida');
      return;
    }
    startTransition(async () => {
      const res = await setItemQuantityReceived({
        item_id: itemId,
        quantity_received: qtyNum,
      });
      if (!res.ok) {
        toast.error('Errore', { description: res.error });
      }
    });
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      <Panel
        title={`Righe trasferimento (${items.length})`}
        padded={false}
        right={
          <StokuBadge variant={STATUS_VARIANT[transfer.status] ?? 'default'}>
            {STATUS_LABEL[transfer.status] ?? transfer.status}
          </StokuBadge>
        }
      >
        {items.length === 0 ? (
          <Empty
            icon="transfer"
            title="Nessun articolo"
            subtitle={
              isDraft
                ? 'Aggiungi il primo articolo dal modulo qui sotto.'
                : 'Trasferimento senza righe.'
            }
          />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 130 }}>SKU</th>
                <th>Nome</th>
                <th style={{ width: 90, textAlign: 'right' }}>Inviati</th>
                {(isInTransit || transfer.status === 'completed') && (
                  <th style={{ width: 120, textAlign: 'right' }}>Ricevuti</th>
                )}
                {isDraft && <th style={{ width: 40 }} />}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const received = it.quantity_received;
                const delta =
                  received != null && received < it.quantity ? it.quantity - received : 0;
                return (
                  <tr key={it.id}>
                    <td className="mono" style={{ fontSize: 11, fontWeight: 500 }}>
                      {it.sku}
                    </td>
                    <td className="truncate-1">{it.name}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {it.quantity}
                    </td>
                    {isInTransit && (
                      <td style={{ textAlign: 'right' }}>
                        <Input
                          type="number"
                          min={0}
                          max={it.quantity}
                          defaultValue={received ?? it.quantity}
                          onBlur={(e) => handleReceivedChange(it.id, e.target.value)}
                          style={{ width: 80, textAlign: 'right' }}
                        />
                      </td>
                    )}
                    {transfer.status === 'completed' && (
                      <td className="mono" style={{ textAlign: 'right' }}>
                        <span
                          style={{ color: delta > 0 ? 'var(--warn)' : undefined }}
                        >
                          {received ?? it.quantity}
                          {delta > 0 && ` (-${delta})`}
                        </span>
                      </td>
                    )}
                    {isDraft && (
                      <td>
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{ width: 24, padding: 0, justifyContent: 'center' }}
                          onClick={() => handleRemove(it.id)}
                          disabled={pending}
                          title="Rimuovi"
                          aria-label="Rimuovi riga"
                        >
                          <Icon name="trash" size={12} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      {isDraft && (
        <Panel title="Aggiungi articolo">
          <div className="col" style={{ gap: 10 }}>
            <div className="stoku-input" style={{ height: 32 }}>
              <Icon name="search" size={13} />
              <input
                type="search"
                placeholder="Cerca…"
                value={productQuery}
                onChange={(e) => {
                  setProductQuery(e.target.value);
                  setSelectedProductId('');
                }}
                autoComplete="off"
              />
            </div>
            {productQuery && (
              <div
                style={{
                  maxHeight: 200,
                  overflow: 'auto',
                  border: '1px solid var(--stoku-border)',
                  borderRadius: 'var(--r-md)',
                }}
              >
                {filtered.length === 0 ? (
                  <div style={{ padding: 12, color: 'var(--ink-3)', fontSize: 12 }}>
                    Nessun prodotto
                  </div>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {filtered.map((p) => (
                      <li key={p.id} style={{ borderBottom: '1px solid var(--stoku-border)' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedProductId(p.id)}
                          style={{
                            width: '100%',
                            padding: '6px 12px',
                            textAlign: 'left',
                            background:
                              selectedProductId === p.id
                                ? 'var(--stoku-accent-bg-weak)'
                                : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 12,
                            display: 'flex',
                            gap: 10,
                          }}
                        >
                          <span className="mono" style={{ fontSize: 11, minWidth: 80 }}>
                            {p.sku}
                          </span>
                          <span style={{ flex: 1 }}>{p.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="row" style={{ gap: 10, alignItems: 'flex-end' }}>
              <div className="col" style={{ gap: 4, width: 100 }}>
                <span className="meta" style={{ fontSize: 11 }}>
                  QTA
                </span>
                <Input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={handleAdd}
                disabled={submitting || !selectedProductId}
              >
                {submitting ? 'Aggiungo…' : 'Aggiungi riga'}
              </Button>
            </div>
          </div>
        </Panel>
      )}

      {nextStatuses.length > 0 && (
        <Panel title="Azioni">
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {nextStatuses.map((s) => {
              const destructive = s === 'cancelled';
              return (
                <Button
                  key={s}
                  type="button"
                  variant={destructive ? 'ghost' : 'default'}
                  onClick={() => handleTransition(s)}
                  disabled={pending || (s === 'in_transit' && items.length === 0)}
                  style={
                    destructive
                      ? { color: 'var(--danger)', borderColor: 'var(--danger)' }
                      : undefined
                  }
                >
                  {STATUS_ACTION_LABEL[s] ?? s}
                </Button>
              );
            })}
          </div>
          {isDraft && items.length === 0 && (
            <div className="meta" style={{ fontSize: 12, marginTop: 6 }}>
              Aggiungi almeno una riga per poter spedire.
            </div>
          )}
        </Panel>
      )}

      <div className="row" style={{ gap: 8 }}>
        <Link href="/transfers" className="btn ghost sm">
          Torna ai trasferimenti
        </Link>
      </div>
    </div>
  );
}
