'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';

type Role = 'admin' | 'sales' | 'warehouse' | 'viewer';

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  roles?: Role[];
};

const MAIN_NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: 'dashboard' },
  { href: '/products', label: 'Inventario', icon: 'box' },
  { href: '/stock', label: 'Magazzino', icon: 'building' },
  { href: '/vehicles', label: 'Veicoli', icon: 'car' },
  { href: '/orders', label: 'Ordini', icon: 'cart' },
  { href: '/customers', label: 'Clienti', icon: 'users' },
  { href: '/transfers', label: 'Trasferimenti', icon: 'transfer', roles: ['admin', 'warehouse'] },
  { href: '/reports', label: 'Report', icon: 'history' },
];

const SETTINGS_NAV: NavItem[] = [
  { href: '/settings/stores', label: 'Punti vendita', icon: 'store', roles: ['admin'] },
  { href: '/settings/users', label: 'Utenti', icon: 'users', roles: ['admin'] },
  { href: '/settings/company', label: 'Azienda', icon: 'building', roles: ['admin'] },
];

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  sales: 'Vendite',
  warehouse: 'Magazzino',
  viewer: 'Visualizzatore',
};

type Props = {
  role: Role;
  email: string;
  fullName: string | null;
};

function initialsFrom(name: string | null, email: string) {
  const src = (name ?? email).trim();
  return (
    src
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'
  );
}

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ role, email, fullName }: Props) {
  const pathname = usePathname();
  const mainItems = MAIN_NAV.filter((i) => !i.roles || i.roles.includes(role));
  const settingsItems = SETTINGS_NAV.filter((i) => !i.roles || i.roles.includes(role));
  const initials = initialsFrom(fullName, email);

  return (
    <aside
      style={{
        background: 'var(--sbar)',
        borderRight: '1px solid var(--sbar-border)',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--sbar-ink)',
        fontSize: 13,
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          height: 'var(--top-h)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px',
          borderBottom: '1px solid var(--sbar-border)',
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 5,
            background: 'var(--stoku-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--stoku-accent-fg)',
            fontFamily: 'var(--font-jetbrains-mono, monospace)',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '-0.04em',
          }}
        >
          S
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: '#fff' }}>
          STOKU
        </div>
        <div style={{ flex: 1 }} />
      </div>

      <nav
        style={{
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          flex: 1,
        }}
      >
        <SectionLabel>Lavoro</SectionLabel>
        {mainItems.map((item) => (
          <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}

        {settingsItems.length > 0 && (
          <>
            <div style={{ height: 12 }} />
            <SectionLabel>Impostazioni</SectionLabel>
            {settingsItems.map((item) => (
              <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
          </>
        )}
      </nav>

      <div style={{ borderTop: '1px solid var(--sbar-border)', padding: 10 }}>
        <div className="row" style={{ gap: 10, padding: 4 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--stoku-accent)',
              color: 'var(--stoku-accent-fg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {initials}
          </div>
          <div className="col stretch" style={{ gap: 0 }}>
            <div
              className="truncate-1"
              style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}
              title={fullName ?? email}
            >
              {fullName ?? email}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--sbar-ink-dim)' }}>{ROLE_LABEL[role]}</div>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title="Esci"
              aria-label="Esci"
              style={{
                width: 22,
                height: 22,
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'transparent',
                color: 'var(--sbar-ink-dim)',
                cursor: 'pointer',
                borderRadius: 4,
              }}
            >
              <Icon name="logout" size={13} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.08em',
        color: 'var(--sbar-ink-dim)',
        textTransform: 'uppercase',
        padding: '6px 10px 4px',
      }}
    >
      {children}
    </div>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const style: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    height: 30,
    padding: '0 10px',
    borderRadius: 'var(--r-sm)',
    background: active ? 'var(--sbar-2)' : 'transparent',
    color: active ? '#fff' : 'var(--sbar-ink)',
    fontSize: 13,
    fontWeight: active ? 500 : 400,
    textDecoration: 'none',
    position: 'relative',
  };

  return (
    <Link href={item.href} style={style}>
      {active && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: -12,
            top: 6,
            bottom: 6,
            width: 2,
            background: 'var(--stoku-accent)',
            borderRadius: 2,
          }}
        />
      )}
      <Icon name={item.icon} size={15} />
      <span className="stretch">{item.label}</span>
    </Link>
  );
}
