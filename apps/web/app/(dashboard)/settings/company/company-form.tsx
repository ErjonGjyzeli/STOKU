'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/ui/panel';
import { StokuButton } from '@/components/ui/stoku-button';
import { upsertCompanySettings, type CompanyInput } from './actions';

export type CompanyFormValues = {
  legal_name: string;
  vat_number: string;
  tax_code: string;
  address_line1: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  iban: string;
  bank_name: string;
  logo_url: string;
  invoice_footer: string;
  default_tax_rate: string;
};

export function CompanyForm({ initial }: { initial: CompanyFormValues }) {
  const [values, setValues] = useState<CompanyFormValues>(initial);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof CompanyFormValues>(key: K, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const payload: CompanyInput = {
      ...values,
      default_tax_rate: values.default_tax_rate,
    };
    const res = await upsertCompanySettings(payload);
    setSubmitting(false);
    if (!res.ok) {
      toast.error('Ruajtja dështoi', { description: res.error });
      return;
    }
    toast.success('Të dhënat e kompanisë u ruajtën');
  }

  return (
    <form onSubmit={onSubmit} className="col" style={{ gap: 16 }}>
      <Panel title="Të dhënat ligjore">
        <div className="col" style={{ gap: 12 }}>
          <Field label="Emri ligjor *">
            <Input
              value={values.legal_name}
              onChange={(e) => set('legal_name', e.target.value)}
              placeholder="Alfa S.R.L."
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="NIPT / P.IVA">
              <Input
                value={values.vat_number}
                onChange={(e) => set('vat_number', e.target.value)}
                placeholder="L12345678A"
              />
            </Field>
            <Field label="Kodi fiskal">
              <Input
                value={values.tax_code}
                onChange={(e) => set('tax_code', e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Panel>

      <Panel title="Selia">
        <div className="col" style={{ gap: 12 }}>
          <Field label="Adresa">
            <Input
              value={values.address_line1}
              onChange={(e) => set('address_line1', e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Kodi postar">
              <Input
                value={values.postal_code}
                onChange={(e) => set('postal_code', e.target.value)}
              />
            </Field>
            <Field label="Qyteti">
              <Input value={values.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="Shteti (ISO 2)">
              <Input
                value={values.country}
                onChange={(e) => set('country', e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="AL"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefoni">
              <Input value={values.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={values.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Panel>

      <Panel title="Bankare">
        <div className="col" style={{ gap: 12 }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="IBAN">
              <Input value={values.iban} onChange={(e) => set('iban', e.target.value)} />
            </Field>
            <Field label="Banka">
              <Input
                value={values.bank_name}
                onChange={(e) => set('bank_name', e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Panel>

      <Panel title="Faturimi">
        <div className="col" style={{ gap: 12 }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="TVSH e parazgjedhur (%)">
              <Input
                inputMode="decimal"
                value={values.default_tax_rate}
                onChange={(e) => set('default_tax_rate', e.target.value)}
                placeholder="20"
              />
            </Field>
            <Field label="URL logo">
              <Input
                value={values.logo_url}
                onChange={(e) => set('logo_url', e.target.value)}
                placeholder="https://…/logo.png"
              />
            </Field>
          </div>
          <Field label="Footer fature (shënime ligjore, kontakte)">
            <textarea
              className="stoku-input"
              style={{ minHeight: 80, padding: 8, width: '100%', resize: 'vertical' }}
              rows={3}
              value={values.invoice_footer}
              onChange={(e) => set('invoice_footer', e.target.value)}
              placeholder="Kompania e regjistruar në regjistër…"
            />
          </Field>
        </div>
      </Panel>

      <div className="row" style={{ gap: 8 }}>
        <StokuButton type="submit" variant="primary" icon="check" disabled={submitting}>
          {submitting ? 'Duke ruajtur…' : 'Ruaj'}
        </StokuButton>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="col" style={{ gap: 4 }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
