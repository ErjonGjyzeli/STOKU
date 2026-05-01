'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Icon } from '@/components/ui/icon';
import { StoreSwitcher } from '@/components/layout/store-switcher';
import { SearchModal } from '@/components/layout/search-modal';
import { useSidebar } from '@/lib/context/sidebar-context';
import type { StoreLite } from '@/lib/auth/session';

type Props = {
  stores: StoreLite[];
};

export function Topbar({ stores }: Props) {
  const router = useRouter();
  const { toggle, mode } = useSidebar();
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = q.trim();
    router.push(trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : '/products');
  }

  function openModal() {
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setQ('');
  }

  return (
    <>
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
      <div
        className="vdivider topbar-divider-store"
        style={{ height: 20, alignSelf: 'center' }}
      />

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
            onFocus={openModal}
            placeholder="Cerca"
            className="topbar-search-input"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'inherit',
              minWidth: 0,
            }}
            autoComplete="off"
            readOnly
          />
        </label>
      </form>

    </header>

    {modalOpen && <SearchModal initialQ={q} onClose={closeModal} />}
    </>
  );
}
