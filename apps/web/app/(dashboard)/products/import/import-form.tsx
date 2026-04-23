'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Icon } from '@/components/ui/icon';
import { Panel } from '@/components/ui/panel';
import { StokuButton } from '@/components/ui/stoku-button';
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
      toast.error('Seleziona un file .xlsx o .csv');
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
      toast.error('Import fallito', { description: res.error });
      return;
    }
    if (res.inserted > 0) {
      toast.success(`${res.inserted} prodotti importati`);
    } else {
      toast.warning('Nessuna riga importata');
    }
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      <Panel padded>
        <form onSubmit={onSubmit} className="col" style={{ gap: 12 }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="meta" style={{ fontSize: 11 }}>
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
                Scegli file
              </StokuButton>
              <span className="meta" style={{ fontSize: 12 }}>
                {fileName ?? 'Nessun file selezionato'}
              </span>
            </div>
          </div>

          <details style={{ fontSize: 12, color: 'var(--ink-2)' }}>
            <summary style={{ cursor: 'pointer' }}>Colonne attese (case-insensitive)</summary>
            <div style={{ paddingTop: 8, lineHeight: 1.5 }}>
              <div>
                <strong>Obbligatorie:</strong> <code>name</code> (o <code>nome</code>)
              </div>
              <div>
                <strong>Opzionali:</strong> <code>sku</code>, <code>legacy_nr</code> (o{' '}
                <code>num</code>, <code>id</code>), <code>oem_code</code>, <code>category</code> (o{' '}
                <code>categoria</code>), <code>condition</code>, <code>price_sell</code> (o{' '}
                <code>prezzo</code>), <code>price_cost</code> (o <code>costo</code>),{' '}
                <code>description</code>
              </div>
              <div style={{ marginTop: 6 }} className="faint">
                SKU vuoto → auto <code>P-000001</code>… Categoria non trovata → null (verrà
                segnalata a fine import).
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
              {submitting ? 'Importazione…' : 'Importa'}
            </StokuButton>
            <Link href="/products" className="btn ghost sm">
              Annulla
            </Link>
          </div>
        </form>
      </Panel>

      {result && result.ok && (
        <Panel title="Risultato import">
          <div className="col" style={{ gap: 8, fontSize: 13 }}>
            <div className="row" style={{ gap: 16 }}>
              <Stat label="Inseriti" value={result.inserted} variant="ok" />
              <Stat label="Saltati" value={result.skipped} variant="warn" />
              <Stat label="Righe totali" value={result.totalRows} />
            </div>

            {result.unknownCategories.length > 0 && (
              <div className="col" style={{ gap: 4 }}>
                <span className="meta" style={{ fontSize: 11 }}>
                  CATEGORIE SCONOSCIUTE (NULL ASSEGNATO)
                </span>
                <div style={{ fontSize: 12 }}>{result.unknownCategories.join(', ')}</div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="col" style={{ gap: 4 }}>
                <span className="meta" style={{ fontSize: 11 }}>
                  ERRORI (PRIMI 50)
                </span>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  {result.errors.map((e, i) => (
                    <div key={i}>
                      Riga {e.row}: {e.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.inserted > 0 && (
              <div className="row" style={{ gap: 8, marginTop: 4 }}>
                <Link href="/products" className="btn primary sm">
                  <Icon name="check" size={12} /> Vai all&apos;inventario
                </Link>
              </div>
            )}
          </div>
        </Panel>
      )}

      {result && !result.ok && (
        <Panel>
          <div className="col" style={{ gap: 6 }}>
            <div style={{ color: 'var(--danger)', fontWeight: 500 }}>Import fallito</div>
            <div className="faint" style={{ fontSize: 13 }}>
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
      <span className="meta" style={{ fontSize: 11 }}>
        {label.toUpperCase()}
      </span>
      <span className="mono" style={{ fontSize: 20, fontWeight: 600, color }}>
        {value.toLocaleString('it-IT')}
      </span>
    </div>
  );
}
