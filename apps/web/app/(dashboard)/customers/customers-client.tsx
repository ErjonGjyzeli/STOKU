'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { StokuButton } from '@/components/ui/stoku-button';
import { formatInt } from '@/lib/format';
import { createCustomer, deleteCustomer, updateCustomer, type CustomerInput } from './actions';
import { CustomerFormDialog, type CustomerFormValues } from './customer-form-dialog';

export type CustomerRow = {
  id: string;
  code: string | null;
  type: string;
  name: string;
  vat_number: string | null;
  tax_code: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  notes: string | null;
};

function toForm(c: CustomerRow): CustomerFormValues {
  return {
    code: c.code ?? '',
    type: (c.type as CustomerFormValues['type']) ?? 'private',
    name: c.name,
    vat_number: c.vat_number ?? '',
    tax_code: c.tax_code ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    address_line1: c.address_line1 ?? '',
    city: c.city ?? '',
    postal_code: c.postal_code ?? '',
    country: c.country ?? 'AL',
    notes: c.notes ?? '',
  };
}

export function CustomersClient({ customers, total }: { customers: CustomerRow[]; total: number }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'business' | 'private'>('all');

  const filtered = customers.filter((c) => {
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (q) {
      const ql = q.toLowerCase();
      if (
        !c.name.toLowerCase().includes(ql) &&
        !(c.phone ?? '').toLowerCase().includes(ql) &&
        !(c.vat_number ?? '').toLowerCase().includes(ql) &&
        !(c.code ?? '').toLowerCase().includes(ql)
      )
        return false;
    }
    return true;
  });

  async function handleCreate(values: CustomerInput) {
    const res = await createCustomer(values);
    if (!res.ok) {
      toast.error('Creazione fallita', { description: res.error });
      return false;
    }
    toast.success('Cliente creato');
    return true;
  }

  async function handleEdit(values: CustomerInput) {
    if (!editing) return false;
    const res = await updateCustomer(editing.id, values);
    if (!res.ok) {
      toast.error('Aggiornamento fallito', { description: res.error });
      return false;
    }
    toast.success('Cliente aggiornato');
    return true;
  }

  function handleDelete(c: CustomerRow) {
    if (!confirm(`Eliminare ${c.name}?`)) return;
    startTransition(async () => {
      const res = await deleteCustomer(c.id);
      if (!res.ok) {
        toast.error('Errore', {
          description: `${res.error} — potrebbero esserci ordini associati`,
        });
        return;
      }
      toast.success('Cliente eliminato');
    });
  }

  return (
    <div>
      <PageHeader
        title="Clienti"
        subtitle={`${formatInt(total)} clienti totali`}
        right={
          <StokuButton icon="plus" variant="primary" onClick={() => setCreating(true)}>
            Nuovo cliente
          </StokuButton>
        }
      />

      {/* Filter bar */}
      <div
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--stoku-border)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <div className="stoku-input" style={{ width: 300, height: 28 }}>
          <Icon name="search" size={13} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome, telefono, NIPT…"
          />
        </div>
        {(['all', 'business', 'private'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setTypeFilter(v)}
            className={typeFilter === v ? 'btn primary sm' : 'btn ghost sm'}
          >
            {v === 'all' ? 'Tutti' : v === 'business' ? 'Azienda' : 'Privato'}
          </button>
        ))}
        {(q || typeFilter !== 'all') && (
          <span className="meta" style={{ fontSize: 11, marginLeft: 4 }}>
            {formatInt(filtered.length)} risultati
          </span>
        )}
      </div>

      <div style={{ padding: 24 }}>
        <Panel padded={false}>
          {filtered.length === 0 ? (
            <Empty
              icon="users"
              title="Nessun cliente"
              subtitle="Crea il primo cliente per iniziare il libro acquisti."
              action={
                <StokuButton icon="plus" variant="primary" onClick={() => setCreating(true)}>
                  Crea cliente
                </StokuButton>
              }
            />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Codice</th>
                  <th>Nome</th>
                  <th style={{ width: 100 }}>Tipo</th>
                  <th style={{ width: 160 }}>Telefono</th>
                  <th style={{ width: 140 }}>Città</th>
                  <th style={{ width: 130 }}>NIPT / P.IVA</th>
                  <th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="mono" style={{ fontWeight: 500, fontSize: 11 }}>
                      {c.code ?? <span className="faint">—</span>}
                    </td>
                    <td className="truncate-1">
                      <Link
                        href={`/customers/${c.id}`}
                        style={{ color: 'inherit', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {c.name}
                      </Link>
                      {c.email && (
                        <span
                          className="faint"
                          style={{ fontSize: 11, marginLeft: 8, fontWeight: 400 }}
                        >
                          {c.email}
                        </span>
                      )}
                    </td>
                    <td>
                      <StokuBadge variant={c.type === 'business' ? 'info' : 'default'}>
                        {c.type === 'business' ? 'Azienda' : 'Privato'}
                      </StokuBadge>
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {c.phone ?? <span className="faint">—</span>}
                    </td>
                    <td>
                      {[c.city, c.country].filter(Boolean).join(', ') || (
                        <span className="faint">—</span>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {c.vat_number ?? <span className="faint">—</span>}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{ width: 24, padding: 0, justifyContent: 'center' }}
                          onClick={() => setEditing(c)}
                          title="Modifica"
                          aria-label="Modifica"
                        >
                          <Icon name="edit" size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{ width: 24, padding: 0, justifyContent: 'center' }}
                          onClick={() => handleDelete(c)}
                          disabled={pending}
                          title="Elimina"
                          aria-label="Elimina"
                        >
                          <Icon name="trash" size={12} />
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

      <CustomerFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSubmit={handleCreate}
        title="Nuovo cliente"
      />
      {editing && (
        <CustomerFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          onSubmit={handleEdit}
          title={`Modifica ${editing.name}`}
          initial={toForm(editing)}
        />
      )}
    </div>
  );
}
