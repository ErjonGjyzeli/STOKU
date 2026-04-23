import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuButton } from '@/components/ui/stoku-button';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { createDraftTransfer } from '../actions';

export const metadata = { title: 'Nuovo trasferimento — STOKU' };

export default async function NewTransferPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: stores } = await supabase
    .from('stores')
    .select('id, code, name')
    .eq('is_active', true)
    .order('code');

  async function submit(formData: FormData) {
    'use server';
    const fromRaw = formData.get('from_store_id');
    const toRaw = formData.get('to_store_id');
    const notes = formData.get('notes');
    const res = await createDraftTransfer({
      from_store_id: fromRaw ? Number(fromRaw) : 0,
      to_store_id: toRaw ? Number(toRaw) : 0,
      notes: notes ? String(notes) : '',
    });
    if (res.ok) redirect(`/transfers/${res.data.id}`);
    redirect(`/transfers/new?error=${encodeURIComponent(res.error)}`);
  }

  return (
    <div>
      <PageHeader
        title="Nuovo trasferimento"
        subtitle="Sposta stock tra punti vendita. Origine decrementata alla spedizione, destinazione incrementata alla ricezione."
        breadcrumb={[{ label: 'Trasferimenti' }, { label: 'Nuovo' }]}
      />
      <div style={{ padding: 24, maxWidth: 640 }}>
        <Panel>
          <form action={submit} className="col" style={{ gap: 14 }}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Origine">
                <select
                  name="from_store_id"
                  className="stoku-input"
                  style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
                  defaultValue={session.activeStoreId ? String(session.activeStoreId) : ''}
                  required
                >
                  <option value="">— Seleziona</option>
                  {(stores ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Destinazione">
                <select
                  name="to_store_id"
                  className="stoku-input"
                  style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
                  required
                >
                  <option value="">— Seleziona</option>
                  {(stores ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Note">
              <textarea
                name="notes"
                className="stoku-input"
                style={{ minHeight: 72, padding: 8, width: '100%', resize: 'vertical' }}
                rows={3}
                placeholder="Motivo trasferimento, tempistiche…"
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
      <span
        className="meta"
        style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
