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
import { addOrderItem, removeOrderItem } from '../actions';

type BadgeVariant = 'default' | 'ok' | 'warn' | 'danger' | 'info' | 'draft' | 'accent';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Bozza',
  confirmed: 'Confermato',
  paid: 'Pagato',
  shipped: 'Spedito',
  completed: 'Completato',
  cancelled: 'Annullato',
};

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'draft',
  confirmed: 'info',
  paid: 'info',
  shipped: 'accent',
  completed: 'ok',
  cancelled: 'danger',
};

export type OrderItemRow = {
  id: string;
  product_id: string | null;
  product_sku_snapshot: string;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  line_total: number | null;
};

export type OrderSummary = {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  tax_rate: number | null;
  tax_amount: number;
  discount_amount: number | null;
  total: number;
  currency: string | null;
};

export type ProductOption = {
  id: string;
  sku: string;
  name: string;
  price_sell: number | null;
  currency: string | null;
};

type Props = {
  order: OrderSummary;
  items: OrderItemRow[];
  products: ProductOption[];
};

function currency(value: number | null, code: string | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: code ?? 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function OrderDetailClient({ order, items, products }: Props) {
  const [productQuery, setProductQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();

  const filteredProducts = useMemo(() => {
    const q = productQuery.toLowerCase().trim();
    if (!q) return products.slice(0, 20);
    return products
      .filter((p) => {
        const hay = `${p.sku} ${p.name}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 20);
  }, [productQuery, products]);

  const isDraft = order.status === 'draft';

  function handleSelectProduct(id: string) {
    setSelectedProductId(id);
    const p = products.find((x) => x.id === id);
    if (p && p.price_sell != null) setPrice(String(p.price_sell));
  }

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
    const res = await addOrderItem({
      order_id: order.id,
      product_id: selectedProductId,
      quantity: qtyNum,
      unit_price: price,
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
    setPrice('');
  }

  function handleRemove(itemId: string) {
    if (!confirm('Rimuovere la riga?')) return;
    startTransition(async () => {
      const res = await removeOrderItem(order.id, itemId);
      if (!res.ok) {
        toast.error('Errore', { description: res.error });
        return;
      }
      toast.success('Riga rimossa');
    });
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      <Panel
        title={`Righe ordine (${items.length})`}
        padded={false}
        right={
          <StokuBadge variant={STATUS_VARIANT[order.status] ?? 'default'}>
            {STATUS_LABEL[order.status] ?? order.status}
          </StokuBadge>
        }
      >
        {items.length === 0 ? (
          <Empty
            icon="cart"
            title="Nessun articolo"
            subtitle={
              isDraft
                ? 'Aggiungi il primo articolo dal modulo qui sotto.'
                : 'Ordine chiuso senza righe.'
            }
          />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 130 }}>SKU</th>
                <th>Nome</th>
                <th style={{ width: 80, textAlign: 'right' }}>Qta</th>
                <th style={{ width: 110, textAlign: 'right' }}>Prezzo</th>
                <th style={{ width: 120, textAlign: 'right' }}>Totale riga</th>
                {isDraft && <th style={{ width: 40 }} />}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="mono" style={{ fontWeight: 500, fontSize: 11 }}>
                    {it.product_sku_snapshot}
                  </td>
                  <td className="truncate-1">{it.product_name_snapshot}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {it.quantity}
                  </td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {currency(it.unit_price, order.currency)}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 500 }}>
                    {currency(it.line_total, order.currency)}
                  </td>
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
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {isDraft && (
        <Panel title="Aggiungi articolo">
          <div className="col" style={{ gap: 10 }}>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <div className="stoku-input" style={{ height: 32, flex: 1 }}>
                <Icon name="search" size={13} />
                <input
                  type="search"
                  placeholder="Cerca per SKU o nome…"
                  value={productQuery}
                  onChange={(e) => {
                    setProductQuery(e.target.value);
                    setSelectedProductId('');
                  }}
                  autoComplete="off"
                />
              </div>
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
                {filteredProducts.length === 0 ? (
                  <div style={{ padding: 12, color: 'var(--ink-3)', fontSize: 13 }}>
                    Nessun prodotto corrispondente
                  </div>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {filteredProducts.map((p) => (
                      <li key={p.id} style={{ borderBottom: '1px solid var(--stoku-border)' }}>
                        <button
                          type="button"
                          onClick={() => handleSelectProduct(p.id)}
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
                            fontSize: 13,
                            display: 'flex',
                            gap: 10,
                            alignItems: 'center',
                          }}
                        >
                          <span className="mono" style={{ fontSize: 11, minWidth: 80 }}>
                            {p.sku}
                          </span>
                          <span style={{ flex: 1 }}>{p.name}</span>
                          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                            {currency(p.price_sell, p.currency)}
                          </span>
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
              <div className="col" style={{ gap: 4, width: 160 }}>
                <span className="meta" style={{ fontSize: 11 }}>
                  PREZZO UNIT.
                </span>
                <Input
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="120,00"
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
            {selectedProductId && (
              <div className="meta" style={{ fontSize: 11 }}>
                Prodotto selezionato:{' '}
                <span className="mono">
                  {products.find((p) => p.id === selectedProductId)?.sku}
                </span>
              </div>
            )}
          </div>
        </Panel>
      )}

      <Panel title="Totali">
        <dl className="col" style={{ gap: 6, margin: 0, fontSize: 13 }}>
          <Row label="Subtotale" value={currency(order.subtotal, order.currency)} />
          <Row
            label={`IVA ${order.tax_rate ?? 0}%`}
            value={currency(order.tax_amount, order.currency)}
          />
          {order.discount_amount && order.discount_amount > 0 && (
            <Row
              label="Sconto"
              value={`- ${currency(order.discount_amount, order.currency)}`}
            />
          )}
          <div style={{ borderTop: '1px solid var(--stoku-border)', paddingTop: 6 }}>
            <Row
              label="Totale"
              value={currency(order.total, order.currency)}
              bold
            />
          </div>
        </dl>
      </Panel>

      <div className="row" style={{ gap: 8 }}>
        <Link href="/orders" className="btn ghost sm">
          Torna agli ordini
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <dt className="meta" style={{ fontSize: 12 }}>
        {label}
      </dt>
      <dd
        className="mono"
        style={{ margin: 0, fontWeight: bold ? 600 : 400, fontSize: bold ? 14 : 13 }}
      >
        {value}
      </dd>
    </div>
  );
}
