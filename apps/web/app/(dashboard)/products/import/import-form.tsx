'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Icon } from '@/components/ui/icon';
import { Panel } from '@/components/ui/panel';
import { StokuButton } from '@/components/ui/stoku-button';
import { formatInt } from '@/lib/format';
import { importProducts, type ImportResult } from './actions';

export function ImportForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.error('Zgjidh një skedar .xlsx ose .csv');
      return;
    }
    setSubmitting(true);
    setResult(null);
    const fd = new FormData();
    fd.append('file', file);
    const res = await importProducts(fd);
    setSubmitting(false);
    setResult(res);
    if (!res.ok) {
      toast.error('Importimi dështoi', { description: res.error });
      return;
    }
    if (res.inserted > 0) {
      toast.success(`${res.inserted} produkte u importuan`);
    } else {
      toast.warning('Asnjë rresht u importua');
    }
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      <Panel padded>
        <form onSubmit={onSubmit} className="col" style={{ gap: 12 }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="meta" style={{ fontSize: 10 }}>
              FILE XLSX / CSV
            </span>
            <div className="row" style={{ gap: 8 }}>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                style={{ display: 'none' }}
                disabled={submitting}
              />
              <StokuButton
                type="button"
                icon="download"
                variant="default"
                onClick={() => inputRef.current?.click()}
                disabled={submitting}
              >
                Zgjidh skedar
              </StokuButton>
              <span className="meta" style={{ fontSize: 11 }}>
                {fileName ?? 'Asnjë skedar i zgjedhur'}
              </span>
            </div>
          </div>

          <details style={{ fontSize: 11, color: 'var(--ink-2)' }}>
            <summary style={{ cursor: 'pointer' }}>Kolonat e pritshme (case-insensitive)</summary>
            <div style={{ paddingTop: 8, lineHeight: 1.5 }}>
              <div>
                <strong>Të detyrueshme:</strong> <code>name</code> (ose <code>nome</code>)
              </div>
              <div>
                <strong>Opsionale:</strong> <code>sku</code>, <code>legacy_nr</code> (ose{' '}
                <code>num</code>, <code>id</code>), <code>oem_code</code>, <code>category</code> (ose{' '}
                <code>categoria</code>), <code>condition</code>, <code>price_sell</code> (ose{' '}
                <code>prezzo</code>), <code>price_cost</code> (ose <code>costo</code>),{' '}
                <code>description</code>
              </div>
              <div style={{ marginTop: 6 }} className="faint">
                SKU bosh → auto <code>P-000001</code>… Kategoria e pagjetur → null (do të
                sinjalizohet në fund të importimit).
              </div>
            </div>
          </details>

          <div className="row" style={{ gap: 8 }}>
            <StokuButton
              type="submit"
              variant="primary"
              icon="plus"
              disabled={submitting || !fileName}
            >
              {submitting ? 'Duke importuar…' : 'Importo'}
            </StokuButton>
            <Link href="/products" className="btn ghost sm">
              Anulo
            </Link>
          </div>
        </form>
      </Panel>

      {result && result.ok && (
        <Panel title="Rezultati i importimit">
          <div className="col" style={{ gap: 8, fontSize: 11 }}>
            <div className="row" style={{ gap: 16 }}>
              <Stat label="Futur" value={result.inserted} variant="ok" />
              <Stat label="Kapërcyer" value={result.skipped} variant="warn" />
              <Stat label="Rreshta gjithsej" value={result.totalRows} />
            </div>

            {result.unknownCategories.length > 0 && (
              <div className="col" style={{ gap: 4 }}>
                <span className="meta" style={{ fontSize: 10 }}>
                  KATEGORI TË PANJOHURA (NULL I CAKTUAR)
                </span>
                <div style={{ fontSize: 11 }}>{result.unknownCategories.join(', ')}</div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="col" style={{ gap: 4 }}>
                <span className="meta" style={{ fontSize: 10 }}>
                  GABIME (PARA 50)
                </span>
                <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                  {result.errors.map((e, i) => (
                    <div key={i}>
                      Rreshti {e.row}: {e.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.inserted > 0 && (
              <div className="row" style={{ gap: 8, marginTop: 4 }}>
                <Link href="/products" className="btn primary sm">
                  <Icon name="check" size={12} /> Shko te produktet
                </Link>
              </div>
            )}
          </div>
        </Panel>
      )}

      {result && !result.ok && (
        <Panel>
          <div className="col" style={{ gap: 6 }}>
            <div style={{ color: 'var(--danger)', fontWeight: 500 }}>Importimi dështoi</div>
            <div className="faint" style={{ fontSize: 11 }}>
              {result.error}
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: 'ok' | 'warn';
}) {
  const color = variant === 'ok' ? 'var(--ok)' : variant === 'warn' ? 'var(--warn)' : undefined;
  return (
    <div className="col" style={{ gap: 2 }}>
      <span className="meta" style={{ fontSize: 10 }}>
        {label.toUpperCase()}
      </span>
      <span className="mono" style={{ fontSize: 20, fontWeight: 600, color }}>
        {formatInt(value)}
      </span>
    </div>
  );
}
