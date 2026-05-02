'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { StokuBadge } from '@/components/ui/stoku-badge';
import { applyInventoryCount } from './actions';

export type CountRow = {
  productId: string;
  sku: string;
  name: string;
  isActive: boolean;
  logical: number;
  reserved: number;
  imageUrl: string | null;
};

type Props = {
  shelf: { id: string; code: string };
  rows: CountRow[];
};

export function InventoryCountClient({ shelf, rows }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Mappa productId → stringa input (numerica o vuota durante editing).
  const [counts, setCounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.productId, String(r.logical)])),
  );

  const stats = useMemo(() => {
    let matches = 0;
    let positive = 0;
    let negative = 0;
    let invalid = 0;
    for (const r of rows) {
      const raw = counts[r.productId];
      const n = Number(raw);
      if (raw === '' || !Number.isInteger(n) || n < 0) {
        invalid += 1;
        continue;
      }
      const delta = n - r.logical;
      if (delta === 0) matches += 1;
      else if (delta > 0) positive += 1;
      else negative += 1;
    }
    return { matches, positive, negative, invalid };
  }, [counts, rows]);

  function handleChange(productId: string, value: string) {
    setCounts((prev) => ({ ...prev, [productId]: value }));
  }

  function resetAllToLogical() {
    setCounts(Object.fromEntries(rows.map((r) => [r.productId, String(r.logical)])));
    toast.success('Vlerat u rivendosën në logjik');
  }

  function handleSubmit() {
    if (stats.invalid > 0) {
      toast.error(`${stats.invalid} rreshta me vlerë të pavlefshme`);
      return;
    }
    const adjustments = stats.positive + stats.negative;
    const msg = adjustments === 0
      ? `Konfirmon që të gjithë ${rows.length} produktet kthehen? Vetëm "kontë e fundit" do të përditësohet.`
      : `Konfirmo rregullimin: ${adjustments} diferenca, ${stats.matches} në barazi.`;
    if (!confirm(msg)) return;

    const payload = rows.map((r) => ({
      productId: r.productId,
      countedQty: Number(counts[r.productId]),
    }));

    startTransition(async () => {
      const res = await applyInventoryCount({ shelfId: shelf.id, counts: payload });
      if (!res.ok) {
        toast.error('Rregullimi dështoi', { description: res.error });
        return;
      }
      const { adjusted, matched, skipped, errors } = res.data;
      const summary = `${matched} në barazi, ${adjusted} rregulluar${
        skipped > 0 ? `, ${skipped} kapërcyer` : ''
      }`;
      if (errors.length > 0) {
        toast.warning(summary, {
          description: errors
            .slice(0, 3)
            .map((e) => e.message)
            .join(' · '),
        });
      } else {
        toast.success(summary);
      }
      router.refresh();
    });
  }

  return (
    <>
      <Panel padded>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Stat label="Rreshtat" value={String(rows.length)} />
          <Stat label="Në barazi" value={String(stats.matches)} tone="ok" />
          <Stat label="Tepricë" value={String(stats.positive)} tone="warn" />
          <Stat label="Mungesë" value={String(stats.negative)} tone="danger" />
          {stats.invalid > 0 && (
            <Stat label="Të pavlefshme" value={String(stats.invalid)} tone="danger" />
          )}
          <div className="row" style={{ gap: 6, marginLeft: 'auto' }}>
            <button
              type="button"
              className="btn ghost sm"
              onClick={resetAllToLogical}
              disabled={pending}
              title="Rivendos të gjitha vlerat në logjik"
            >
              Rivendos logjikun
            </button>
            <Button type="button" onClick={handleSubmit} disabled={pending}>
              {pending ? 'Duke ruajtur…' : 'Konfirmo rregullimin'}
            </Button>
          </div>
        </div>
      </Panel>

      <Panel padded={false}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 56 }} />
              <th style={{ width: 130 }}>SKU</th>
              <th>Produkti</th>
              <th style={{ width: 80, textAlign: 'right' }}>Logjik</th>
              <th style={{ width: 90, textAlign: 'right' }}>Rez.</th>
              <th style={{ width: 110, textAlign: 'right' }}>Reale</th>
              <th style={{ width: 80, textAlign: 'right' }}>Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const raw = counts[row.productId];
              const n = Number(raw);
              const valid = raw !== '' && Number.isInteger(n) && n >= 0;
              const delta = valid ? n - row.logical : 0;
              const deltaColor =
                !valid
                  ? 'var(--danger)'
                  : delta === 0
                    ? 'var(--ink-3)'
                    : delta > 0
                      ? 'var(--ok)'
                      : 'var(--danger)';
              const rowBg =
                valid && delta !== 0 ? 'var(--stoku-accent-bg-weak)' : undefined;
              return (
                <tr key={row.productId} style={rowBg ? { background: rowBg } : undefined}>
                  <td>
                    {row.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.imageUrl}
                        alt=""
                        width={36}
                        height={36}
                        style={{
                          objectFit: 'cover',
                          borderRadius: 4,
                          background: 'var(--panel-2)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 4,
                          background: 'var(--panel-2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--ink-4)',
                        }}
                      >
                        <Icon name="image" size={14} />
                      </div>
                    )}
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {row.sku}
                  </td>
                  <td className="truncate-1">
                    {row.name}
                    {!row.isActive && (
                      <StokuBadge variant="draft" style={{ marginLeft: 8 }}>
                        Çaktivizuar
                      </StokuBadge>
                    )}
                  </td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {row.logical}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>
                    {row.reserved > 0 ? row.reserved : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={raw}
                      onChange={(e) => handleChange(row.productId, e.target.value)}
                      disabled={pending}
                      style={{ width: 90, textAlign: 'right' }}
                    />
                  </td>
                  <td
                    className="mono"
                    style={{ textAlign: 'right', color: deltaColor, fontWeight: 500 }}
                  >
                    {valid ? (delta > 0 ? `+${delta}` : delta) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'ok' | 'warn' | 'danger';
}) {
  const color =
    tone === 'ok'
      ? 'var(--ok)'
      : tone === 'warn'
        ? 'var(--warn)'
        : tone === 'danger'
          ? 'var(--danger)'
          : undefined;
  return (
    <div
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--stoku-border)',
        borderRadius: 'var(--r-md)',
        padding: '8px 12px',
        minWidth: 90,
      }}
    >
      <div
        className="meta"
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2, color }}>{value}</div>
    </div>
  );
}
