'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Icon } from '@/components/ui/icon';
import { StoreSwitcher } from '@/components/layout/store-switcher';
import { SearchModal } from '@/components/layout/search-modal';
import { useSidebar } from '@/lib/context/sidebar-context';
import type { StoreLite } from '@/lib/auth/session';

type Props = {
  stores: StoreLite[];
};

const PAGE_TITLES: Record<string, string> = {
  '/': 'Paneli',
  '/scanner': 'Skaneri',
  '/products': 'Produktet',
  '/tires': 'Gomat',
  '/stock': 'Magazina',
  '/shelves': 'Raftet',
  '/orders': 'Porositë',
  '/orders/new': 'Porosi e re',
  '/customers': 'Klientët',
  '/transfers': 'Transferimet',
  '/transfers/new': 'Transferim i ri',
  '/reports': 'Raporte',
  '/labels': 'Etiketat',
  '/settings/stores': 'Pikat e shitjes',
  '/settings/users': 'Përdoruesit',
  '/settings/company': 'Kompania',
  '/import': 'Import Excel',
};

function getPageTitle(pathname: string): string {
  const exact = PAGE_TITLES[pathname];
  if (exact) return exact;
  if (pathname.startsWith('/products/')) return 'Produktet';
  if (pathname.startsWith('/orders/')) return 'Porositë';
  if (pathname.startsWith('/customers/')) return 'Klientët';
  if (pathname.startsWith('/transfers/')) return 'Transferimet';
  if (pathname.startsWith('/shelves/')) return 'Raftet';
  if (pathname.startsWith('/settings/')) return 'Cilësimet';
  return '';
}

export function Topbar({ stores }: Props) {
  const pathname = usePathname();
  const { toggle, mode } = useSidebar();
  const [modalOpen, setModalOpen] = useState(false);
  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setModalOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px',
          borderBottom: '1px solid var(--border)',
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
          title={mode === 'collapsed' ? 'Hap menunë' : 'Mbyll menunë'}
          aria-label="Toggle sidebar"
        >
          <Icon name="menu" size={14} />
        </button>

        <StoreSwitcher stores={stores} />
        <div className="vdivider" style={{ height: 20, alignSelf: 'center' }} />

        {pageTitle && (
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{pageTitle}</span>
        )}

        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="row topbar-search-btn"
          style={{
            height: 28,
            padding: '0 10px',
            gap: 8,
            background: 'var(--panel-2)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--r-md)',
            cursor: 'pointer',
            width: 220,
            flexShrink: 0,
            fontFamily: 'inherit',
            color: 'inherit',
          }}
          aria-label="Kërko"
        >
          <Icon name="search" size={13} />
          <span className="dim topbar-search-label" style={{ fontSize: 11, flex: 1, textAlign: 'left' }}>
            Kërko…
          </span>
        </button>
      </header>

      {modalOpen && <SearchModal initialQ="" onClose={() => setModalOpen(false)} />}
    </>
  );
}
