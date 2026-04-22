import { Icon } from '@/components/ui/icon';
import { StokuButton } from '@/components/ui/stoku-button';
import { StoreSwitcher } from '@/components/layout/store-switcher';
import type { StoreLite } from '@/lib/auth/session';

type Props = {
  stores: StoreLite[];
};

export function Topbar({ stores }: Props) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 16px',
        borderBottom: '1px solid var(--stoku-border)',
        background: 'var(--panel)',
        minWidth: 0,
        height: 'var(--top-h)',
      }}
    >
      <StoreSwitcher stores={stores} />
      <div className="vdivider" style={{ height: 20, alignSelf: 'center' }} />

      <div style={{ flex: 1 }} />

      <button
        type="button"
        className="row"
        style={{
          height: 28,
          padding: '0 10px',
          gap: 8,
          background: 'var(--panel-2)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--r-md)',
          cursor: 'pointer',
          minWidth: 260,
          color: 'inherit',
        }}
        disabled
        title="Disponibile dalla Fase 2"
      >
        <Icon name="search" size={13} />
        <span className="dim stretch" style={{ fontSize: 12, textAlign: 'left' }}>
          Cerca prodotti, clienti, ordini…
        </span>
        <span className="kbd">⌘</span>
        <span className="kbd">K</span>
      </button>

      <StokuButton icon="plus" variant="primary" disabled title="Disponibile dalla Fase 5">
        Nuovo ordine
      </StokuButton>

      <div className="vdivider" style={{ height: 20 }} />
      <button
        type="button"
        className="btn ghost"
        style={{ padding: 6, width: 28, position: 'relative' }}
        title="Notifiche"
        aria-label="Notifiche"
      >
        <Icon name="bell" size={14} />
      </button>
    </header>
  );
}
