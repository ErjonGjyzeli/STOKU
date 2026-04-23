import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuButton } from '@/components/ui/stoku-button';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { createDraftOrder } from '../actions';

export const metadata = { title: 'Nuovo ordine — STOKU' };

export default async function NewOrderPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from('customers')
    .select('id, code, name, type')
    .order('name');

  async function submit(formData: FormData) {
    'use server';
    const customerId = formData.get('customer_id');
    const storeId = formData.get('store_id');
    const notes = formData.get('notes');
    const res = await createDraftOrder({
      customer_id: customerId ? String(customerId) : null,
      store_id: storeId ? Number(storeId) : 0,
      notes: notes ? String(notes) : '',
    });
    if (res.ok) redirect(`/orders/${res.data.id}`);
    // Errore: redirect con query string per mostrarlo (lo gestiamo come
    // fallback; UI più ricca in F5.5 con toast via action state).
    redirect(`/orders/new?error=${encodeURIComponent(res.error)}`);
  }

  return (
    <div>
      <PageHeader
        title="Nuovo ordine"
        subtitle="Crea bozza ordine; gli articoli si aggiungono dopo, con reserve stock automatica."
        breadcrumb={[{ label: 'Ordini' }, { label: 'Nuovo' }]}
      />
      <div style={{ padding: 24, maxWidth: 640 }}>
        <Panel>
          <form action={submit} className="col" style={{ gap: 14 }}>
            <Field label="Cliente (opzionale — vendita banco se vuoto)">
              <select
                name="customer_id"
                className="stoku-input"
                style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
                defaultValue=""
              >
                <option value="">— Vendita banco</option>
                {(customers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.code, c.name].filter(Boolean).join(' · ')}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Punto vendita">
              <select
                name="store_id"
                className="stoku-input"
                style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
                defaultValue={session.activeStoreId ? String(session.activeStoreId) : ''}
                required
              >
                <option value="">— Seleziona</option>
                {session.stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Note interne (opzionale)">
              <textarea
                name="notes"
                className="stoku-input"
                style={{ minHeight: 72, padding: 8, width: '100%', resize: 'vertical' }}
                rows={3}
                placeholder="Specifiche tecniche, richieste, reminder…"
              />
            </Field>

            <div className="row" style={{ gap: 8 }}>
              <StokuButton type="submit" variant="primary" icon="plus">
                Crea bozza
              </StokuButton>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="col" style={{ gap: 4 }}>
      <span className="meta" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      {children}
    </label>
  );
}
