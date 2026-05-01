'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { useSidebar } from '@/lib/context/sidebar-context';

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
  const { mode, close } = useSidebar();
  const collapsed = mode === 'collapsed';
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
        height: '100vh',
        overflow: 'hidden',
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
          flexShrink: 0,
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
            flexShrink: 0,
          }}
        >
          S
        </div>
        {!collapsed && (
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: '#fff' }}>
            STOKU
          </div>
        )}
      </div>

      <nav
        style={{
          padding: '10px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          flex: 1,
          overflow: 'auto',
          minHeight: 0,
        }}
      >
        {!collapsed && <SectionLabel>Lavoro</SectionLabel>}
        {mainItems.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            collapsed={collapsed}
            onNavigate={close}
          />
        ))}

        {settingsItems.length > 0 && (
          <>
            <div style={{ height: 12 }} />
            {!collapsed && <SectionLabel>Impostazioni</SectionLabel>}
            {settingsItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
                collapsed={collapsed}
                onNavigate={close}
              />
            ))}
          </>
        )}
      </nav>

      <div style={{ borderTop: '1px solid var(--sbar-border)', padding: 10, flexShrink: 0 }}>
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
              flexShrink: 0,
            }}
            title={fullName ?? email}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="col stretch" style={{ gap: 0, minWidth: 0 }}>
              <div
                className="truncate-1"
                style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}
                title={fullName ?? email}
              >
                {fullName ?? email}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--sbar-ink-dim)' }}>{ROLE_LABEL[role]}</div>
            </div>
          )}
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

function SidebarLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const style: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    height: 32,
    padding: collapsed ? '0' : '0 10px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    borderRadius: 'var(--r-sm)',
    background: active ? 'var(--sbar-2)' : 'transparent',
    color: active ? '#fff' : 'var(--sbar-ink)',
    fontSize: 13,
    fontWeight: active ? 500 : 400,
    textDecoration: 'none',
    position: 'relative',
  };

  return (
    <Link href={item.href} style={style} title={collapsed ? item.label : undefined} onClick={onNavigate}>
      {active && !collapsed && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: -8,
            top: 6,
            bottom: 6,
            width: 2,
            background: 'var(--stoku-accent)',
            borderRadius: 2,
          }}
        />
      )}
      <Icon name={item.icon} size={15} />
      {!collapsed && <span className="stretch">{item.label}</span>}
    </Link>
  );
}
