'use client';

import {
  Boxes,
  Car,
  Home,
  Package,
  Repeat,
  Settings,
  ShoppingCart,
  Users,
  Warehouse,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type Role = 'admin' | 'sales' | 'warehouse' | 'viewer';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
};

const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/products', label: 'Prodotti', icon: Package },
  { href: '/stock', label: 'Magazzino', icon: Boxes },
  { href: '/orders', label: 'Ordini', icon: ShoppingCart },
  { href: '/customers', label: 'Clienti', icon: Users },
  { href: '/vehicles', label: 'Veicoli', icon: Car },
  { href: '/transfers', label: 'Trasferimenti', icon: Repeat, roles: ['admin', 'warehouse'] },
];

const SETTINGS_NAV: NavItem[] = [
  { href: '/settings/stores', label: 'Punti vendita', icon: Warehouse, roles: ['admin'] },
  { href: '/settings/users', label: 'Utenti staff', icon: Users, roles: ['admin'] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  const visibleMain = NAV.filter((i) => !i.roles || i.roles.includes(role));
  const visibleSettings = SETTINGS_NAV.filter((i) => !i.roles || i.roles.includes(role));

  return (
    <aside className="bg-card sticky top-0 hidden h-screen w-56 shrink-0 border-r md:flex md:flex-col">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="text-base font-semibold tracking-tight">
          STOKU
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {visibleMain.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        {visibleSettings.length > 0 && (
          <>
            <div className="text-muted-foreground mt-4 px-2 text-xs font-medium uppercase">
              Impostazioni
            </div>
            {visibleSettings.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
          </>
        )}
      </nav>
      <div className="text-muted-foreground border-t p-3 text-xs">
        <Settings className="inline size-3" /> v0.1.0
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
        active && 'bg-muted text-foreground font-medium',
      )}
    >
      <Icon className="size-4" />
      {item.label}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
