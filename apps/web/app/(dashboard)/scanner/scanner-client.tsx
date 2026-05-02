'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';

import { Empty } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { createClient } from '@/lib/supabase/client';

type Mode = 'camera' | 'usb' | 'manual';
type ScanAction = 'lookup' | 'intake' | 'sale' | 'adjust';
type ScanType = 'product' | 'shelf' | 'unknown';

type ScanItem = {
  id: string;
  type: ScanType;
  raw: string;
  sku: string | null;
  productName: string | null;
  qty: number;
  available: number | null;
  href: string | null;
  ts: number;
  loading: boolean;
};

type CameraState = 'idle' | 'requesting' | 'active' | 'error';

const MAX_HISTORY = 20;
const DEDUP_MS = 3000;

function parseScanText(text: string): { type: ScanType; key: string | null } {
  const trimmed = text.trim();
  let pathname = trimmed;
  try {
    const u = new URL(trimmed);
    pathname = u.pathname;
  } catch {
    // not a URL
  }
  const m = pathname.match(/^\/(p|s)\/(.+?)\/?$/);
  if (!m) return { type: 'unknown', key: null };
  const [, kind, key] = m;
  return { type: kind === 'p' ? 'product' : 'shelf', key: decodeURIComponent(key) };
}

type Props = {
  storeCode: string;
  activeStoreId: number | null;
  userName: string;
};

export function ScannerClient({ storeCode, activeStoreId, userName }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const usbInputRef = useRef<HTMLInputElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastByTextRef = useRef<Map<string, number>>(new Map());
  const sessionStartRef = useRef<Date>(new Date());

  const [mode, setMode] = useState<Mode>('camera');
  const [action, setAction] = useState<ScanAction>('lookup');
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [manualCode, setManualCode] = useState('');
  const [soundScan, setSoundScan] = useState(true);
  const [soundVibrate, setSoundVibrate] = useState(true);
  const [autoOpen, setAutoOpen] = useState(false);

  const totalQty = scans.reduce((a, s) => a + s.qty, 0);

  const enrichScan = useCallback(
    async (id: string, type: ScanType, key: string) => {
      const supabase = createClient();
      try {
        if (type === 'product') {
          const { data } = await supabase
            .from('products')
            .select('sku, name, stock(quantity, reserved_quantity, store_id)')
            .ilike('sku', key)
            .maybeSingle();
          const storeStocks = (data?.stock ?? []) as Array<{
            quantity: number;
            reserved_quantity: number;
            store_id: number;
          }>;
          const storeStock = activeStoreId
            ? storeStocks.find((s) => s.store_id === activeStoreId)
            : storeStocks[0];
          const available =
            storeStock != null
              ? Math.max(0, storeStock.quantity - storeStock.reserved_quantity)
              : null;
          setScans((prev) =>
            prev.map((s) =>
              s.id === id
                ? { ...s, loading: false, sku: data?.sku ?? key, productName: data?.name ?? null, available }
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
                    sku: data?.code ?? key,
                    productName: data?.description ?? null,
                    href: data ? `/shelves/${data.id}` : `/shelves?q=${encodeURIComponent(key)}`,
                  }
                : s,
            ),
          );
        }
      } catch {
        setScans((prev) =>
          prev.map((s) => (s.id === id ? { ...s, loading: false } : s)),
        );
      }
    },
    [activeStoreId],
  );

  const handleScanText = useCallback(
    (text: string) => {
      const now = Date.now();
      const last = lastByTextRef.current.get(text);
      if (last && now - last < DEDUP_MS) return;
      lastByTextRef.current.set(text, now);

      const { type, key } = parseScanText(text);
      const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
      const href =
        type === 'product' && key ? `/products?q=${encodeURIComponent(key)}` : null;

      const item: ScanItem = {
        id,
        type,
        raw: text,
        sku: key,
        productName: null,
        qty: 1,
        available: null,
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
      setCameraError('Kamera nuk mbështetet nga ky browser');
      return;
    }
    setCameraState('requesting');
    setCameraError(null);
    try {
      const reader = new BrowserMultiFormatReader();
      const video = videoRef.current;
      if (!video) {
        setCameraState('error');
        setCameraError('Elementi video nuk është gati');
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
      setCameraError(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Qasja në kamerë u refuzua. Jep lejet dhe provo përsëri.'
          : err instanceof Error
            ? err.message
            : 'Gabim gjatë nisjes së kamerës',
      );
    }
  }, [handleScanText]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mode === 'camera') {
      void startCamera();
    } else {
      stopCamera();
    }
  }, [mode]);

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mode !== 'usb') return;
    const el = usbInputRef.current;
    if (!el) return;
    el.focus();
    const onBlur = () => {
      setTimeout(() => {
        const tag = document.activeElement?.tagName ?? '';
        if (['INPUT', 'BUTTON', 'A'].includes(tag)) return;
        el.focus();
      }, 50);
    };
    el.addEventListener('blur', onBlur);
    return () => el.removeEventListener('blur', onBlur);
  }, [mode]);

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

  const submitManual = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!manualCode) return;
      handleScanText(manualCode);
      setManualCode('');
    },
    [manualCode, handleScanText],
  );

  const clearHistory = useCallback(() => {
    setScans([]);
    lastByTextRef.current.clear();
  }, []);

  const removeItem = useCallback((id: string) => {
    setScans((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const sessionStart = sessionStartRef.current.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div>
      <PageHeader
        title="Scanner"
        subtitle={
          <>
            Skanim i vazhdueshëm · Pika{' '}
            <span className="mono">{storeCode || '—'}</span>
          </>
        }
        right={
          <>
            <div
              className="row"
              style={{
                gap: 0,
                border: '1px solid var(--stoku-border)',
                borderRadius: 'var(--r-md)',
                overflow: 'hidden',
              }}
            >
              {(['camera', 'usb', 'manual'] as Mode[]).map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={mode === m ? 'btn primary sm' : 'btn ghost sm'}
                  style={{
                    borderRadius: 0,
                    borderLeft: i > 0 ? '1px solid var(--stoku-border)' : 'none',
                  }}
                >
                  <Icon
                    name={m === 'camera' ? 'qr' : m === 'usb' ? 'keyboard' : 'edit'}
                    size={12}
                  />
                  {m === 'camera' ? 'Kamera' : m === 'usb' ? 'USB' : 'Manual'}
                </button>
              ))}
            </div>
            <button type="button" className="btn ghost sm" onClick={clearHistory}>
              <Icon name="x" size={12} /> Pastro listën
            </button>
          </>
        }
      />

      <div className="scanner-layout"
        style={{
          padding: 20,
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        {/* Left: camera area + scan table */}
        <div className="col" style={{ gap: 14 }}>
          {/* Dark camera area */}
          <div
            style={{
              background: '#0d0d0c',
              color: '#fff',
              borderRadius: 'var(--r-lg)',
              position: 'relative',
              height: 320,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Frame overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 24,
                border: '2px solid rgba(255,255,255,0.18)',
                borderRadius: 'var(--r-md)',
                pointerEvents: 'none',
              }}
            />
            {/* Laser line */}
            <div
              style={{
                position: 'absolute',
                left: 24,
                right: 24,
                top: '50%',
                height: 2,
                background: 'var(--stoku-accent)',
                boxShadow: '0 0 18px var(--stoku-accent)',
                pointerEvents: 'none',
              }}
            />
            {/* REC indicator */}
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 14,
                fontSize: 10,
                fontFamily: 'var(--f-mono)',
                opacity: 0.6,
                color: '#fff',
              }}
            >
              ● REC
            </div>

            {/* Camera mode */}
            {mode === 'camera' && (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: cameraState === 'active' ? 'block' : 'none',
                  }}
                />
                {cameraState !== 'active' && (
                  <div className="col" style={{ alignItems: 'center', gap: 8, zIndex: 1 }}>
                    <Icon name="qr" size={48} />
                    {cameraState === 'error' ? (
                      <div
                        style={{
                          color: 'var(--danger)',
                          fontSize: 11,
                          textAlign: 'center',
                          maxWidth: 260,
                        }}
                      >
                        {cameraError}
                      </div>
                    ) : cameraState === 'requesting' ? (
                      <div style={{ fontSize: 11, fontWeight: 500 }}>
                        Duke nisur kamerën…
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 500 }}>
                          Drejto barkodin / QR
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.6 }}>
                          Kamera aktive · dritë e mjaftueshme
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* USB mode */}
            {mode === 'usb' && (
              <div
                className="col"
                style={{ alignItems: 'center', gap: 8, zIndex: 1, width: '70%' }}
              >
                <Icon name="keyboard" size={42} />
                <div style={{ fontSize: 11, fontWeight: 500 }}>
                  Skaneri USB i lidhur
                </div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>
                  Skanoni — kodi do të arrijë automatikisht
                </div>
                <input
                  ref={usbInputRef}
                  type="text"
                  onKeyDown={handleUsbKeyDown}
                  placeholder="Duke pritur skanimin USB…"
                  style={{
                    width: '100%',
                    height: 38,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 'var(--r-md)',
                    color: '#fff',
                    fontFamily: 'var(--f-mono)',
                    fontSize: 11,
                    padding: '0 12px',
                    marginTop: 8,
                  }}
                />
              </div>
            )}

            {/* Manual mode */}
            {mode === 'manual' && (
              <form
                onSubmit={submitManual}
                className="col"
                style={{ alignItems: 'center', gap: 10, zIndex: 1, width: '70%' }}
              >
                <Icon name="edit" size={28} />
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  Fut kodin SKU / OEM
                </div>
                <input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="ABS-1042"
                  autoFocus
                  style={{
                    width: '100%',
                    height: 38,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 'var(--r-md)',
                    color: '#fff',
                    fontFamily: 'var(--f-mono)',
                    fontSize: 11,
                    padding: '0 12px',
                  }}
                />
                <button type="submit" className="btn primary sm">
                  Shto
                </button>
              </form>
            )}
          </div>

          {/* Scan session table */}
          <Panel
            title={`Skanimet e kësaj sesioni (${scans.length})`}
            padded={false}
            right={
              <span className="mono meta" style={{ fontSize: 10 }}>
                {totalQty} copë
              </span>
            }
          >
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>Produkti</th>
                  <th style={{ width: 110 }}>SKU</th>
                  <th style={{ width: 60, textAlign: 'center' }}>Sasi</th>
                  <th style={{ width: 80 }}>Stok tani</th>
                  <th style={{ width: 80 }}>Kur</th>
                  <th style={{ width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {scans.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <Empty
                        icon="qr"
                        title="Asnjë skanim ende"
                        subtitle="Skanoni barkodin e parë për të filluar."
                      />
                    </td>
                  </tr>
                ) : (
                  scans.map((s, i) => (
                    <tr key={s.id}>
                      <td
                        className="mono meta"
                        style={{ textAlign: 'center' }}
                      >
                        {i + 1}
                      </td>
                      <td className="truncate-1">
                        {s.loading ? (
                          <span className="meta">Lookup…</span>
                        ) : s.productName ? (
                          s.productName
                        ) : (
                          <span className="faint">
                            {s.raw.slice(0, 30)}
                          </span>
                        )}
                      </td>
                      <td>
                        {s.sku ? (
                          s.href ? (
                            <Link
                              href={s.href}
                              className="mono"
                              style={{ fontSize: 10, color: 'inherit' }}
                            >
                              {s.sku}
                            </Link>
                          ) : (
                            <span className="mono" style={{ fontSize: 10 }}>
                              {s.sku}
                            </span>
                          )
                        ) : (
                          <span className="faint">—</span>
                        )}
                      </td>
                      <td className="mono" style={{ textAlign: 'center' }}>
                        {s.qty}
                      </td>
                      <td>
                        {s.available != null ? (
                          <span
                            className="mono"
                            style={{
                              fontSize: 11,
                              color:
                                s.available === 0
                                  ? 'var(--danger)'
                                  : s.available <= 1
                                    ? 'var(--warn)'
                                    : 'var(--ok)',
                            }}
                          >
                            {s.available}
                          </span>
                        ) : (
                          <span className="faint">—</span>
                        )}
                      </td>
                      <td className="meta" style={{ fontSize: 10 }}>
                        {new Date(s.ts).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{
                            width: 22,
                            padding: 0,
                            justifyContent: 'center',
                          }}
                          onClick={() => removeItem(s.id)}
                          aria-label="Hiq"
                        >
                          <Icon name="x" size={11} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Panel>
        </div>

        {/* Right sidebar */}
        <div className="col" style={{ gap: 14, position: 'sticky', top: 14 }}>
          {/* Action on scan */}
          <Panel title="Veprimi gjatë skanimit">
            <div className="col" style={{ gap: 6 }}>
              {(
                [
                  { v: 'lookup', label: 'Vetëm shiko', sub: 'Hap detajet e produktit' },
                  { v: 'intake', label: 'Ngarkim stoku', sub: 'Shto +1 në pikën e shitjes' },
                  { v: 'sale', label: 'Shitje', sub: 'Hap POS me ato copë' },
                  { v: 'adjust', label: 'Rregullim', sub: 'Korrigjo sasinë' },
                ] as { v: ScanAction; label: string; sub: string }[]
              ).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setAction(o.v)}
                  className="row"
                  style={{
                    width: '100%',
                    gap: 10,
                    padding: 8,
                    textAlign: 'left',
                    border:
                      '1px solid ' +
                      (action === o.v ? 'var(--stoku-accent)' : 'var(--stoku-border)'),
                    background:
                      action === o.v ? 'var(--stoku-accent-bg)' : 'var(--panel)',
                    borderRadius: 'var(--r-md)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    color: 'inherit',
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      flexShrink: 0,
                      borderRadius: '50%',
                      border:
                        '2px solid ' +
                        (action === o.v
                          ? 'var(--stoku-accent)'
                          : 'var(--stoku-border)'),
                      background:
                        action === o.v ? 'var(--stoku-accent)' : 'transparent',
                    }}
                  />
                  <div className="col" style={{ gap: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 500 }}>{o.label}</span>
                    <span className="meta" style={{ fontSize: 10 }}>
                      {o.sub}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          {/* Session stats */}
          <Panel title="Sesioni">
            <div className="col" style={{ gap: 8 }}>
              <StatRow label="Filluar" value={sessionStart} />
              <StatRow
                label="Pika"
                value={<span className="mono">{storeCode || '—'}</span>}
              />
              <StatRow label="Operatori" value={userName || '—'} />
              <StatRow
                label="Skanimet"
                value={<span className="mono">{scans.length}</span>}
              />
              <StatRow
                label="Copë gjithsej"
                value={<span className="mono">{totalQty}</span>}
              />
            </div>
          </Panel>

          {/* Sounds */}
          <Panel title="Tinguj">
            <div className="col" style={{ gap: 6, fontSize: 11 }}>
              <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={soundScan}
                  onChange={(e) => setSoundScan(e.target.checked)}
                />
                Bip pas çdo skanimi
              </label>
              <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={soundVibrate}
                  onChange={(e) => setSoundVibrate(e.target.checked)}
                />
                Vibrim celular
              </label>
              <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoOpen}
                  onChange={(e) => setAutoOpen(e.target.checked)}
                />
                Hap automatikisht detajet
              </label>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      className="row"
      style={{ justifyContent: 'space-between', fontSize: 11 }}
    >
      <span className="meta">{label}</span>
      <span>{value}</span>
    </div>
  );
}
