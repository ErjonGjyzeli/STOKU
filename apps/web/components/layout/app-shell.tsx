'use client';

import { useSidebar } from '@/lib/context/sidebar-context';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { mode, close } = useSidebar();
  const dataAttr = mode === 'open' ? 'open' : mode === 'collapsed' ? 'collapsed' : 'expanded';

  return (
    <div className="stoku-app" data-sidebar={dataAttr}>
      {children}
      <div
        className="stoku-sidebar-backdrop"
        onClick={close}
        role="presentation"
        aria-hidden="true"
      />
    </div>
  );
}
