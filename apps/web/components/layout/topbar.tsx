'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Icon } from '@/components/ui/icon';
import { StokuButton } from '@/components/ui/stoku-button';
import { StoreSwitcher } from '@/components/layout/store-switcher';
import { useSidebar } from '@/lib/context/sidebar-context';
import type { StoreLite } from '@/lib/auth/session';

type Props = {
  stores: StoreLite[];
};

export function Topbar({ stores }: Props) {
  const router = useRouter();
  const { toggle, mode } = useSidebar();
  const [q, setQ] = useState('');

  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = q.trim();
    router.push(trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : '/products');
  }

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 12px',
        borderBottom: '1px solid var(--stoku-border)',
        background: 'var(--panel)',
        minWidth: 0,
        height: 'var(--top-h)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <button
        type="button"
        onClick={toggle}
        className="btn ghost"
        style={{ padding: 6, width: 28, flexShrink: 0 }}
        title={mode === 'collapsed' ? 'Apri menu' : 'Collassa menu'}
        aria-label="Toggle sidebar"
      >
        <Icon name="menu" size={14} />
      </button>

      <StoreSwitcher stores={stores} />
      <div className="vdivider" style={{ height: 20, alignSelf: 'center' }} />

      <form onSubmit={submitSearch} className="topbar-search" style={{ flex: 1, maxWidth: 420 }}>
        <label
          className="row"
          style={{
            height: 28,
            padding: '0 10px',
            gap: 8,
            background: 'var(--panel-2)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--r-md)',
            cursor: 'text',
          }}
        >
          <Icon name="search" size={13} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca prodotti, SKU, OEM, numero ex-Excel…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 12,
              color: 'inherit',
              minWidth: 0,
            }}
            autoComplete="off"
          />
        </label>
      </form>

      <div style={{ flex: 1 }} />

      <Link href="/orders?new=1" className="topbar-new-order-link">
        <StokuButton icon="plus" variant="primary" size="sm">
          <span>Nuovo ordine</span>
        </StokuButton>
      </Link>

      <div className="vdivider topbar-divider" style={{ height: 20 }} />
      <button
        type="button"
        className="btn ghost topbar-bell"
        style={{ padding: 6, width: 28, position: 'relative' }}
        title="Notifiche"
        aria-label="Notifiche"
      >
        <Icon name="bell" size={14} />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--danger)',
          }}
        />
      </button>
    </header>
  );
}
