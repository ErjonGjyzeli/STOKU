'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Icon } from '@/components/ui/icon';
import { Field } from '@/components/ui/field';
import { StokuButton } from '@/components/ui/stoku-button';
import { createClient } from '@/lib/supabase/client';

const schema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'Password minimo 6 caratteri'),
});

type FormValues = z.infer<typeof schema>;

const FEATURES = [
  '5.920+ pezzi tracciati dal magazzino',
  'Ricerca per marca e modello veicolo',
  'Stock multi-punto con prenotazioni ordini',
  'Ruoli: admin, vendite, magazzino, visualizzatore',
];

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      setSubmitting(false);
      toast.error('Accesso fallito', { description: error.message });
      return;
    }

    // Full-page navigation so server-rendered layout receives fresh auth
    // cookies on its first hit; client router state tree can diverge between
    // (auth)/login and (dashboard)/ groups when we only soft-navigate.
    window.location.assign(next);
  }

  return (
    <div className="login-shell" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <aside
        className="login-aside"
        style={{
          background: 'var(--sbar)',
          color: 'var(--sbar-ink)',
          padding: '48px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div className="row" style={{ gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: 'var(--stoku-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--stoku-accent-fg)',
              fontFamily: 'var(--font-jetbrains-mono, monospace)',
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            S
          </div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 18, letterSpacing: '-0.01em' }}>
            STOKU
          </div>
        </div>

        <div>
          <h1
            style={{
              color: '#fff',
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              margin: 0,
              maxWidth: 460,
            }}
          >
            Magazzino, clienti e fatture{' '}
            <span style={{ color: 'var(--stoku-accent)' }}>in un posto solo.</span>
          </h1>
          <p
            style={{
              marginTop: 20,
              fontSize: 14,
              color: 'var(--sbar-ink-dim)',
              maxWidth: 460,
              lineHeight: 1.5,
            }}
          >
            Gestionale per ricambi auto usati su più punti vendita. Ruoli staff, trasferimenti, IVA
            20%, fatture PDF.
          </p>
          <div className="col" style={{ gap: 8, marginTop: 28, fontSize: 13 }}>
            {FEATURES.map((feature) => (
              <div key={feature} className="row" style={{ gap: 8 }}>
                <Icon name="check" size={14} />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="meta" style={{ fontSize: 11, color: 'var(--sbar-ink-dim)' }}>STOKU</div>
      </aside>

      <section
        className="login-form-section"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
            Bentornato.
          </h2>
          <p className="meta" style={{ fontSize: 13, marginTop: 4 }}>
            Accedi per continuare.
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}
            noValidate
          >
            <Field label="Email" htmlFor="login-email" error={errors.email?.message}>
              <div className="stoku-input" style={{ height: 36 }}>
                <Icon name="user" size={14} />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
              </div>
            </Field>

            <Field label="Password" htmlFor="login-password" error={errors.password?.message}>
              <div className="stoku-input" style={{ height: 36 }}>
                <Icon name="lock" size={14} />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
              </div>
            </Field>

            <StokuButton
              type="submit"
              variant="primary"
              size="lg"
              block
              disabled={submitting}
              style={{ marginTop: 4 }}
            >
              {submitting ? 'Accesso…' : 'Accedi a STOKU'}
            </StokuButton>
          </form>

          <p className="meta" style={{ fontSize: 11, textAlign: 'center', marginTop: 28 }}>
            Problemi ad accedere? Contatta l&apos;admin dell&apos;azienda.
          </p>
        </div>
      </section>
    </div>
  );
}
