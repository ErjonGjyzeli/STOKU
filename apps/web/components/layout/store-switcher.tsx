'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Icon } from '@/components/ui/icon';
import { useStoreContext } from '@/lib/context/store-context';
import type { StoreLite } from '@/lib/auth/session';

const STORAGE_KEY = 'stoku:active-store';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

function readSaved() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? Number(raw) : null;
}

export function StoreSwitcher({ stores }: { stores: StoreLite[] }) {
  const { activeStoreId, setActiveStoreId } = useStoreContext();
  const savedId = useSyncExternalStore(subscribe, readSaved, () => null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (stores.length === 0) {
    return (
      <span className="meta" style={{ fontSize: 12 }}>
        Nessun punto vendita
      </span>
    );
  }

  const fallback = stores[0].id;
  const effectiveId =
    activeStoreId ?? (savedId != null && stores.some((s) => s.id === savedId) ? savedId : fallback);
  const active = stores.find((s) => s.id === effectiveId) ?? stores[0];

  function select(id: number) {
    setActiveStoreId(id);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(id));
    }
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn"
        style={{ gap: 8, height: 28 }}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="store" size={13} />
        <span style={{ fontWeight: 500 }}>{active.code}</span>
        <span className="dim" style={{ fontSize: 11 }}>
          · {active.name}
        </span>
        <Icon name="chevronDown" size={11} />
      </button>

      {open && (
        <div
          className="pop"
          style={{ position: 'absolute', top: 34, left: 0, minWidth: 260, padding: 6, zIndex: 20 }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: 'var(--ink-3)',
              textTransform: 'uppercase',
              padding: '6px 10px 4px',
            }}
          >
            Cambia punto vendita
          </div>
          {stores.map((s) => (
            <button
              key={s.id}
              type="button"
              className="pop-item"
              style={{ background: s.id === effectiveId ? 'var(--stoku-accent-bg)' : undefined }}
              onClick={() => select(s.id)}
            >
              <Icon name="store" size={13} />
              <div className="col stretch" style={{ gap: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>
                  {s.code} · {s.name}
                </div>
              </div>
              {s.id === effectiveId && <Icon name="check" size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
