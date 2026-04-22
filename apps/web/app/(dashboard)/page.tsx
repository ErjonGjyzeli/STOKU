import { Empty } from '@/components/ui/empty';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { StokuButton } from '@/components/ui/stoku-button';
import { requireSession } from '@/lib/auth/session';

const KPIS: Array<{ label: string; value: string; hint: string }> = [
  { label: 'Vendite oggi', value: '—', hint: 'Disponibile dalla Fase 5' },
  { label: 'Ordini draft', value: '—', hint: 'Disponibile dalla Fase 5' },
  { label: 'Stock basso', value: '—', hint: 'Disponibile dalla Fase 2' },
  { label: 'Prodotti attivi', value: '—', hint: 'Disponibile dalla Fase 2' },
];

export default async function HomePage() {
  const session = await requireSession();
  const firstName = session.profile.full_name?.split(' ')[0] ?? '';
  const greet = firstName ? `Benvenuto, ${firstName}` : 'Benvenuto';
  const todayLabel = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div>
      <PageHeader
        title={greet}
        subtitle={todayLabel}
        right={
          <>
            <StokuButton icon="download" size="sm" disabled title="Disponibile dalla Fase 7">
              Esporta report
            </StokuButton>
            <StokuButton icon="plus" variant="primary" disabled title="Disponibile dalla Fase 5">
              Nuovo ordine
            </StokuButton>
          </>
        }
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 12,
          }}
        >
          {KPIS.map((kpi) => (
            <div
              key={kpi.label}
              style={{
                padding: '14px 16px',
                background: 'var(--panel)',
                border: '1px solid var(--stoku-border)',
                borderRadius: 'var(--r-lg)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--ink-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {kpi.label}
              </div>
              <div
                className="mono"
                style={{
                  marginTop: 6,
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                }}
              >
                {kpi.value}
              </div>
              <div className="meta" style={{ fontSize: 11, marginTop: 2 }}>
                {kpi.hint}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 16,
          }}
        >
          <Panel title="Ordini recenti" padded={false}>
            <Empty
              icon="cart"
              title="Nessun ordine ancora"
              subtitle="La gestione ordini arriverà nella Fase 5."
            />
          </Panel>

          <div className="col" style={{ gap: 16 }}>
            <Panel title="Stock basso" padded={false}>
              <Empty
                icon="box"
                title="Nessun prodotto"
                subtitle="L’inventario sarà disponibile nella Fase 2."
              />
            </Panel>

            <Panel title="Trasferimenti in corso" padded={false}>
              <Empty
                icon="truck"
                title="Nessun trasferimento"
                subtitle="Modulo trasferimenti previsto in Fase 6."
              />
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
