'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/ui/icon';

type ProductResult = {
  id: string;
  sku: string;
  name: string;
  vehicle_make: string | null;
  tire_width: number | null;
  tire_aspect: number | null;
  tire_diameter: number | null;
  category: { kind: string; slug: string } | { kind: string; slug: string }[] | null;
};
type CustomerResult = { id: string; code: string | null; name: string };
type OrderResult = {
  id: string;
  order_number: string;
  status: string;
  customer: { name: string } | null;
};
type StaffResult = { id: string; full_name: string | null; email: string; role: string };
type ShelfResult = {
  id: string;
  code: string;
  description: string | null;
  store: { code: string } | null;
};
type StoreResult = { id: number; code: string; name: string };
type SearchResults = {
  products: ProductResult[];
  customers: CustomerResult[];
  orders: OrderResult[];
  staff: StaffResult[];
  shelves: ShelfResult[];
  stores: StoreResult[];
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  confirmed: 'Konfirmuar',
  paid: 'Paguar',
  shipped: 'Dërguar',
  completed: 'Kompletuar',
  cancelled: 'Anuluar',
};

const SEASON_LABELS: Record<string, string> = {
  'tires-summer': 'Verore',
  'tires-winter': 'Dimërore',
  'tires-allseason': '4 Stinë',
};

type ResultItem = {
  key: string;
  href: string;
  icon: string;
  primary: string;
  secondary: string | null;
  type: string;
  typeColor: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  sales: 'Shitje',
  warehouse: 'Magazina',
  viewer: 'Vëzhgues',
};

function buildItems(results: SearchResults): ResultItem[] {
  const items: ResultItem[] = [];

  for (const p of results.products) {
    const cat = Array.isArray(p.category) ? p.category[0] : p.category;
    const isTire = cat?.kind === 'gomma';
    if (isTire) {
      const size =
        p.tire_width && p.tire_aspect && p.tire_diameter
          ? `${p.tire_width}/${p.tire_aspect} R${p.tire_diameter}`
          : p.sku;
      const brand = p.vehicle_make ?? null;
      const season = cat?.slug ? (SEASON_LABELS[cat.slug] ?? null) : null;
      const sub = [brand, season].filter(Boolean).join(' · ');
      items.push({
        key: `tire-${p.id}`,
        href: `/tires?q=${encodeURIComponent(p.sku)}`,
        icon: 'disc',
        primary: size,
        secondary: sub || null,
        type: 'Gomë',
        typeColor: 'var(--color-blue, #3b82f6)',
      });
    } else {
      items.push({
        key: `prod-${p.id}`,
        href: `/products?q=${encodeURIComponent(p.sku)}`,
        icon: 'box',
        primary: p.name,
        secondary: p.sku,
        type: 'Produkt',
        typeColor: 'var(--color-green, #22c55e)',
      });
    }
  }

  for (const c of results.customers) {
    items.push({
      key: `cust-${c.id}`,
      href: `/customers/${c.id}`,
      icon: 'user',
      primary: c.name,
      secondary: c.code ?? null,
      type: 'Klient',
      typeColor: 'var(--color-orange, #f97316)',
    });
  }

  for (const o of results.orders) {
    const sub = [STATUS_LABELS[o.status] ?? o.status, o.customer?.name]
      .filter(Boolean)
      .join(' · ');
    items.push({
      key: `ord-${o.id}`,
      href: `/orders/${o.id}`,
      icon: 'cart',
      primary: o.order_number,
      secondary: sub || null,
      type: 'Porosi',
      typeColor: 'var(--ink-4)',
    });
  }

  for (const s of results.staff) {
    items.push({
      key: `staff-${s.id}`,
      href: `/settings/users`,
      icon: 'users',
      primary: s.full_name ?? s.email,
      secondary: [ROLE_LABELS[s.role] ?? s.role, s.email].filter(Boolean).join(' · '),
      type: 'Përdorues',
      typeColor: 'var(--ink-4)',
    });
  }

  for (const sh of results.shelves) {
    const store = Array.isArray(sh.store) ? sh.store[0] : sh.store;
    items.push({
      key: `shelf-${sh.id}`,
      href: `/shelves/${sh.id}`,
      icon: 'building',
      primary: sh.code,
      secondary: [sh.description, store?.code].filter(Boolean).join(' · '),
      type: 'Raft',
      typeColor: 'var(--ink-4)',
    });
  }

  for (const st of results.stores) {
    items.push({
      key: `store-${st.id}`,
      href: `/settings/stores`,
      icon: 'store',
      primary: st.name,
      secondary: st.code,
      type: 'Pikë shitjeje',
      typeColor: 'var(--ink-4)',
    });
  }

  return items;
}

type Props = {
  initialQ: string;
  onClose: () => void;
};

export function SearchModal({ initialQ, onClose }: Props) {
  const [q, setQ] = useState(initialQ);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const items = results ? buildItems(results) : [];

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100 }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: 64,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 640,
          maxWidth: 'calc(100vw - 24px)',
          maxHeight: 'calc(100dvh - 96px)',
          background: 'var(--panel)',
          borderRadius: 'var(--r-lg)',
          border: '1px solid var(--stoku-border)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Input row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 14px',
            borderBottom: '1px solid var(--stoku-border)',
            height: 40,
            flexShrink: 0,
          }}
        >
          <Icon name="search" size={15} />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kërko…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 11,
              color: 'inherit',
            }}
          />
          {loading && (
            <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>…</span>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              fontSize: 10,
              color: 'var(--ink-4)',
              background: 'var(--panel-2)',
              border: '1px solid var(--stoku-border)',
              borderRadius: 4,
              padding: '2px 6px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
          {q.trim().length < 2 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 10, color: 'var(--ink-4)' }}>
              Shkruani për të kërkuar
            </div>
          )}

          {q.trim().length >= 2 && !loading && items.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 10, color: 'var(--ink-4)' }}>
              Asnjë rezultat për <strong>"{q}"</strong>
            </div>
          )}

          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 16px',
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer',
              }}
              className="search-result-row"
            >
              <Icon name={item.icon as Parameters<typeof Icon>[0]['name']} size={12} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.primary}
                </div>
                {item.secondary && (
                  <div style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 1 }}>
                    {item.secondary}
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  color: item.typeColor,
                  flexShrink: 0,
                  textTransform: 'uppercase',
                  opacity: 0.8,
                }}
              >
                {item.type}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
