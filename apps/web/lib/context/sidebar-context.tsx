'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type Mode = 'expanded' | 'collapsed' | 'open';
// Semantica:
// - desktop: expanded | collapsed
// - mobile: open (drawer visibile) | collapsed (drawer chiuso). Sull'iniziale
//   boot mobile lo stato è 'collapsed' — il drawer è nascosto finché l'utente
//   non apre dal topbar.

type SidebarContextValue = {
  mode: Mode;
  toggle: () => void;
  close: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

const STORAGE_KEY = 'stoku.sidebar-collapsed';

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('expanded');

  // Inizializza da localStorage + viewport al mount. Lo state è client-only
  // (il layout server rende sempre 'expanded' di default, poi hydration sistema).
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const initial: Mode = isMobile ? 'collapsed' : saved === '1' ? 'collapsed' : 'expanded';
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init da env browser, non reactive
    setMode(initial);
  }, []);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (isMobile) {
        return prev === 'open' ? 'collapsed' : 'open';
      }
      const next = prev === 'expanded' ? 'collapsed' : 'expanded';
      localStorage.setItem(STORAGE_KEY, next === 'collapsed' ? '1' : '0');
      return next;
    });
  }, []);

  const close = useCallback(() => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) setMode('collapsed');
  }, []);

  const value = useMemo(() => ({ mode, toggle, close }), [mode, toggle, close]);
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar outside SidebarProvider');
  return ctx;
}
