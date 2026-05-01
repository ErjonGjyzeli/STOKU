'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { useStoreContext } from '@/lib/context/store-context';
import { setActiveStore } from '@/lib/auth/actions';
import type { StoreLite } from '@/lib/auth/session';

export function StoreSwitcher({ stores }: { stores: StoreLite[] }) {
  const router = useRouter();
  const { activeStoreId, setActiveStoreId } = useStoreContext();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
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

  const active = activeStoreId ? (stores.find((s) => s.id === activeStoreId) ?? null) : null;

  function select(id: number | null) {
    if (id === activeStoreId) {
      setOpen(false);
      return;
    }
    const prev = activeStoreId;
    setActiveStoreId(id);
    setOpen(false);
    startTransition(async () => {
      const res = await setActiveStore(id);
      if (!res.ok) {
        toast.error('Errore cambio punto vendita', { description: res.error });
        setActiveStoreId(prev);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn"
        style={{ gap: 8, height: 28 }}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="store" size={13} />
        {active ? (
          <>
            <span className="topbar-store-code" style={{ fontWeight: 500 }}>
              {active.code}
            </span>
            <span className="dim topbar-store-name" style={{ fontSize: 11 }}>
              · {active.name}
            </span>
          </>
        ) : (
          <span className="topbar-store-code" style={{ fontWeight: 500 }}>
            Tutti i magazzini
          </span>
        )}
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
            Cambia scope
          </div>

          <button
            type="button"
            className="pop-item"
            style={{ background: activeStoreId == null ? 'var(--stoku-accent-bg)' : undefined }}
            onClick={() => select(null)}
          >
            <Icon name="grid" size={13} />
            <div className="col stretch" style={{ gap: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>Tutti i magazzini</div>
              <div className="meta" style={{ fontSize: 10 }}>
                Nessuno scope — liste non filtrate
              </div>
            </div>
            {activeStoreId == null && <Icon name="check" size={13} />}
          </button>

          <div style={{ height: 6 }} />

          {stores.map((s) => (
            <button
              key={s.id}
              type="button"
              className="pop-item"
              style={{ background: s.id === activeStoreId ? 'var(--stoku-accent-bg)' : undefined }}
              onClick={() => select(s.id)}
            >
              <Icon name="store" size={13} />
              <div className="col stretch" style={{ gap: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>
                  {s.code} · {s.name}
                </div>
              </div>
              {s.id === activeStoreId && <Icon name="check" size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
