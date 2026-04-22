'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type StoreContextValue = {
  activeStoreId: number | null;
  setActiveStoreId: (id: number | null) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({
  initialStoreId,
  children,
}: {
  initialStoreId: number | null;
  children: ReactNode;
}) {
  const [activeStoreId, setActiveStoreId] = useState<number | null>(initialStoreId);
  return (
    <StoreContext.Provider value={{ activeStoreId, setActiveStoreId }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStoreContext() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStoreContext must be used within StoreProvider');
  return ctx;
}
