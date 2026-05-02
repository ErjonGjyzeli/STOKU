'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { Panel } from '@/components/ui/panel';
import { StokuButton } from '@/components/ui/stoku-button';
import { createClient } from '@/lib/supabase/client';

type ScanType = 'product' | 'shelf' | 'unknown';

type ScanItem = {
  id: string;
  type: ScanType;
  raw: string;
  // sku per product, code per shelf
  key: string | null;
  label: string | null;
  detail: string | null;
  href: string | null;
  ts: number;
  loading: boolean;
};

type CameraState = 'idle' | 'requesting' | 'active' | 'error';

const MAX_HISTORY = 10;
// Burst dedup: una stessa stringa entro 3s viene ignorata (zxing emette
// più volte lo stesso frame se il QR resta inquadrato).
const DEDUP_MS = 3000;

// URL può essere assoluto (https://stoku.app/p/SKU) o path-only (/p/SKU)
// se uno scanner USB invia solo il path. Anche raw "/p/SKU" deve passare.
function parseScanText(text: string): { type: ScanType; key: string | null } {
  const trimmed = text.trim();
  let pathname = trimmed;
  try {
    const u = new URL(trimmed);
    pathname = u.pathname;
  } catch {
    // non è un URL: cerchiamo direttamente pattern path-only
  }
  const m = pathname.match(/^\/(p|s)\/(.+?)\/?$/);
  if (!m) return { type: 'unknown', key: null };
  const [, kind, key] = m;
  return {
    type: kind === 'p' ? 'product' : 'shelf',
    key: decodeURIComponent(key),
  };
}

export function ScannerClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const usbInputRef = useRef<HTMLInputElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastByTextRef = useRef<Map<string, number>>(new Map());

  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scans, setScans] = useState<ScanItem[]>([]);

  const enrichScan = useCallback(async (id: string, type: ScanType, key: string) => {
    const supabase = createClient();
    try {
      if (type === 'product') {
        const { data } = await supabase
          .from('products')
          .select('sku, name')
          .ilike('sku', key)
          .maybeSingle();
        setScans((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  loading: false,
                  label: data?.name ?? key,
                  detail: data ? data.sku : 'Prodotto non trovato in questo scope',
                }
              : s,
          ),
        );
      } else if (type === 'shelf') {
        const { data } = await supabase
          .from('shelves')
          .select('id, code, description')
          .ilike('code', key)
          .maybeSingle();
        setScans((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  loading: false,
                  label: data?.description ?? key,
                  detail: data ? data.code : 'Scaffale non trovato in questo scope',
                  href: data ? `/shelves/${data.id}` : `/shelves?q=${encodeURIComponent(key)}`,
                }
              : s,
          ),
        );
      }
    } catch {
      // Lookup ottimistico: se fallisce mostriamo solo la chiave.
      setScans((prev) =>
        prev.map((s) => (s.id === id ? { ...s, loading: false } : s)),
      );
    }
  }, []);

  const handleScanText = useCallback(
    (text: string) => {
      const now = Date.now();
      const last = lastByTextRef.current.get(text);
      if (last && now - last < DEDUP_MS) return;
      lastByTextRef.current.set(text, now);

      const { type, key } = parseScanText(text);
      const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
      const href =
        type === 'product' && key
          ? `/p/${encodeURIComponent(key)}`
          : type === 'shelf' && key
            ? `/s/${encodeURIComponent(key)}`
            : null;

      const item: ScanItem = {
        id,
        type,
        raw: text,
        key,
        label: key,
        detail: null,
        href,
        ts: now,
        loading: type !== 'unknown',
      };

      setScans((prev) => [item, ...prev].slice(0, MAX_HISTORY));

      if (key && (type === 'product' || type === 'shelf')) {
        void enrichScan(id, type, key);
      }
    },
    [enrichScan],
  );

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraState('idle');
  }, []);

  const startCamera = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('error');
      setCameraError('Fotocamera non supportata da questo browser');
      return;
    }

    setCameraState('requesting');
    setCameraError(null);

    try {
      const reader = new BrowserMultiFormatReader();
      const video = videoRef.current;
      if (!video) {
        setCameraState('error');
        setCameraError('Elemento video non pronto');
        return;
      }
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        video,
        (result) => {
          if (result) handleScanText(result.getText());
        },
      );
      controlsRef.current = controls;
      setCameraState('active');
    } catch (err) {
      setCameraState('error');
      const msg = err instanceof Error ? err.message : 'Errore avvio fotocamera';
      // NotAllowedError → utente ha rifiutato i permessi
      setCameraError(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Accesso alla fotocamera negato. Concedi i permessi e riprova.'
          : msg,
      );
    }
  }, [handleScanText]);

  // Cleanup: stoppa stream allo smontaggio per non lasciare la camera
  // accesa (LED) anche dopo navigazione.
  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  // USB-HID: autofocus all'apertura e refocus su blur per non perdere
  // la cattura dei keystrokes dello scanner cablato.
  useEffect(() => {
    const el = usbInputRef.current;
    if (!el) return;
    el.focus();
    const onBlur = () => {
      // Refocus differito: se l'utente sta cliccando su un Link/bottone
      // diamogli un frame prima di rubargli il focus.
      setTimeout(() => {
        if (document.activeElement?.tagName === 'INPUT') return;
        if (document.activeElement?.tagName === 'BUTTON') return;
        if (document.activeElement?.tagName === 'A') return;
        el.focus();
      }, 50);
    };
    el.addEventListener('blur', onBlur);
    return () => el.removeEventListener('blur', onBlur);
  }, []);

  const handleUsbKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const value = e.currentTarget.value.trim();
      e.currentTarget.value = '';
      if (value) handleScanText(value);
    },
    [handleScanText],
  );

  const clearHistory = useCallback(() => {
    setScans([]);
    lastByTextRef.current.clear();
  }, []);

  return (
    <div className="col" style={{ gap: 16 }}>
      <Panel padded>
        <div className="col" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Icon name="keyboard" size={14} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              Stai usando uno scanner USB? Punta qui sopra
            </span>
            <span className="meta" style={{ fontSize: 12 }}>
              Lo scanner cablato invia il codice come tasti + Invio.
            </span>
          </div>
          <input
            ref={usbInputRef}
            type="text"
            autoFocus
            onKeyDown={handleUsbKeyDown}
            placeholder="In attesa di scansione USB…"
            className="stoku-input"
            style={{ height: 36, padding: '0 12px', fontFamily: 'var(--font-jetbrains-mono, monospace)' }}
            aria-label="Input scanner USB"
          />
        </div>
      </Panel>

      <Panel
        title="Fotocamera"
        right={
          cameraState === 'active' ? (
            <StokuButton size="sm" variant="ghost" icon="x" onClick={stopCamera}>
              Stop fotocamera
            </StokuButton>
          ) : (
            <StokuButton
              size="sm"
              variant="primary"
              icon="scanner"
              onClick={startCamera}
              disabled={cameraState === 'requesting'}
            >
              {cameraState === 'requesting' ? 'Avvio…' : 'Avvia fotocamera'}
            </StokuButton>
          )
        }
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 480,
            margin: '0 auto',
            aspectRatio: '4 / 3',
            background: 'var(--panel-2)',
            borderRadius: 'var(--r-md)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: cameraState === 'active' ? 'block' : 'none',
            }}
          />
          {cameraState !== 'active' && (
            <div
              className="col"
              style={{
                alignItems: 'center',
                gap: 8,
                color: 'var(--ink-3)',
                fontSize: 12,
                padding: 16,
                textAlign: 'center',
              }}
            >
              <Icon name="scanner" size={32} />
              {cameraState === 'error' ? (
                <div style={{ color: 'var(--danger)' }}>{cameraError ?? 'Errore'}</div>
              ) : cameraState === 'requesting' ? (
                <div>Avvio fotocamera…</div>
              ) : (
                <div>Premi &laquo;Avvia fotocamera&raquo; per iniziare</div>
              )}
            </div>
          )}
        </div>
      </Panel>

      <Panel
        title={`Ultime scansioni${scans.length > 0 ? ` (${scans.length})` : ''}`}
        padded={false}
        right={
          scans.length > 0 ? (
            <StokuButton size="sm" variant="ghost" icon="trash" onClick={clearHistory}>
              Pulisci storia
            </StokuButton>
          ) : undefined
        }
      >
        {scans.length === 0 ? (
          <Empty
            icon="scanner"
            title="Nessuna scansione ancora"
            subtitle="Inquadra un QR di prodotto o scaffale."
          />
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {scans.map((s) => (
              <ScanRow key={s.id} item={s} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function ScanRow({ item }: { item: ScanItem }) {
  const typeLabel =
    item.type === 'product' ? 'Prodotto' : item.type === 'shelf' ? 'Scaffale' : 'Sconosciuto';
  const typeColor =
    item.type === 'product'
      ? 'var(--accent)'
      : item.type === 'shelf'
        ? 'var(--info, var(--accent))'
        : 'var(--ink-3)';

  return (
    <li
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--stoku-border)',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div className="col" style={{ gap: 2, minWidth: 0, flex: 1 }}>
        <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: typeColor,
            }}
          >
            {typeLabel}
          </span>
          {item.key && (
            <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>
              {item.key}
            </span>
          )}
          {item.loading && <span className="meta" style={{ fontSize: 11 }}>Lookup…</span>}
        </div>
        {item.label && item.label !== item.key && (
          <div className="truncate-1" style={{ fontSize: 13 }}>
            {item.label}
          </div>
        )}
        {item.detail && (
          <div className="meta" style={{ fontSize: 11 }}>
            {item.detail}
          </div>
        )}
        {item.type === 'unknown' && (
          <div className="mono truncate-1" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {item.raw}
          </div>
        )}
        <div className="meta" style={{ fontSize: 10 }}>
          {new Date(item.ts).toLocaleTimeString('it-IT')}
        </div>
      </div>
      {item.href ? (
        <Link href={item.href} className="btn ghost sm" style={{ flexShrink: 0 }}>
          Apri dettaglio <Icon name="chevronRight" size={11} />
        </Link>
      ) : null}
    </li>
  );
}
