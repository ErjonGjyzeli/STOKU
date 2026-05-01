'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Icon } from '@/components/ui/icon';
import { StokuButton } from '@/components/ui/stoku-button';

export type TiresFilters = {
  q: string;
  width: string;
  aspect: string;
  diameter: string;
  season: '' | 'summer' | 'winter' | 'allseason';
  treadMin: string;
  dotMax: string;
  set4: boolean;
};

type Props = {
  initial: TiresFilters;
  hasFilters: boolean;
};

// Misure comuni mercato albanese/europeo (citroën C3, Fiat Punto, Golf, A3, ecc.)
const COMMON_SIZES: Array<{ width: string; aspect: string; diameter: string; label: string }> = [
  { width: '205', aspect: '55', diameter: '16', label: '205/55 R16' },
  { width: '195', aspect: '65', diameter: '15', label: '195/65 R15' },
  { width: '225', aspect: '45', diameter: '17', label: '225/45 R17' },
  { width: '215', aspect: '55', diameter: '17', label: '215/55 R17' },
  { width: '175', aspect: '65', diameter: '14', label: '175/65 R14' },
];

const SEASONS: Array<{ value: TiresFilters['season']; label: string }> = [
  { value: '', label: 'Tutte' },
  { value: 'summer', label: 'Estive' },
  { value: 'winter', label: 'Invernali' },
  { value: 'allseason', label: '4 stagioni' },
];

const CURRENT_YEAR = new Date().getFullYear();
const DOT_YEARS = Array.from({ length: CURRENT_YEAR - 2017 }, (_, i) => CURRENT_YEAR - i);

function buildHref(values: TiresFilters): string {
  const params = new URLSearchParams();
  if (values.q) params.set('q', values.q);
  if (values.width) params.set('width', values.width);
  if (values.aspect) params.set('aspect', values.aspect);
  if (values.diameter) params.set('diameter', values.diameter);
  if (values.season) params.set('season', values.season);
  if (values.treadMin) params.set('tread_min', values.treadMin);
  if (values.dotMax) params.set('dot_max', values.dotMax);
  if (values.set4) params.set('set4', '1');
  const s = params.toString();
  return s ? `/tires?${s}` : '/tires';
}

export function TiresFilterBar({ initial, hasFilters }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<TiresFilters>(initial);

  function update<K extends keyof TiresFilters>(key: K, value: TiresFilters[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function applySize(width: string, aspect: string, diameter: string) {
    const next = { ...values, width, aspect, diameter };
    setValues(next);
    router.push(buildHref(next));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push(buildHref(values));
  }

  function handleReset() {
    router.push('/tires');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="col"
      style={{ gap: 12 }}
    >
      {/* Riga 1: ricerca + misura */}
      <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label className="col" style={{ gap: 4, flex: '1 1 240px' }}>
          <span className="meta" style={{ fontSize: 11 }}>CERCA</span>
          <div className="stoku-input" style={{ height: 32 }}>
            <Icon name="search" size={13} />
            <input
              type="search"
              name="q"
              value={values.q}
              onChange={(e) => update('q', e.target.value)}
              placeholder='Marca, modello, SKU · "frase esatta"'
              autoComplete="off"
            />
          </div>
        </label>
        <label className="col" style={{ gap: 4, width: 88 }}>
          <span className="meta" style={{ fontSize: 11 }}>LARG. (mm)</span>
          <input
            type="number"
            inputMode="numeric"
            min={100}
            max={400}
            value={values.width}
            onChange={(e) => update('width', e.target.value)}
            className="stoku-input"
            style={{ height: 32, padding: '0 10px' }}
            placeholder="205"
          />
        </label>
        <label className="col" style={{ gap: 4, width: 80 }}>
          <span className="meta" style={{ fontSize: 11 }}>SPALLA (%)</span>
          <input
            type="number"
            inputMode="numeric"
            min={20}
            max={90}
            value={values.aspect}
            onChange={(e) => update('aspect', e.target.value)}
            className="stoku-input"
            style={{ height: 32, padding: '0 10px' }}
            placeholder="55"
          />
        </label>
        <label className="col" style={{ gap: 4, width: 88 }}>
          <span className="meta" style={{ fontSize: 11 }}>DIAM. (″)</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min={8}
            max={24}
            value={values.diameter}
            onChange={(e) => update('diameter', e.target.value)}
            className="stoku-input"
            style={{ height: 32, padding: '0 10px' }}
            placeholder="16"
          />
        </label>
        <div className="row" style={{ gap: 6, marginLeft: 'auto' }}>
          <StokuButton type="submit" variant="primary" size="sm" icon="search">
            Filtra
          </StokuButton>
          {hasFilters && (
            <StokuButton type="button" variant="ghost" size="sm" onClick={handleReset}>
              Pulisci filtri
            </StokuButton>
          )}
        </div>
      </div>

      {/* Riga 2: chip misure comuni */}
      <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="meta" style={{ fontSize: 11 }}>MISURE FREQUENTI</span>
        {COMMON_SIZES.map((s) => {
          const active =
            values.width === s.width &&
            values.aspect === s.aspect &&
            values.diameter === s.diameter;
          return (
            <button
              key={s.label}
              type="button"
              className={`btn ${active ? 'primary' : 'ghost'} sm`}
              onClick={() => applySize(s.width, s.aspect, s.diameter)}
              style={{ fontFamily: 'var(--font-jetbrains-mono, monospace)' }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Riga 3: stagione + battistrada + DOT + set4 */}
      <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label className="col" style={{ gap: 4, width: 280 }}>
          <span className="meta" style={{ fontSize: 11 }}>STAGIONE</span>
          <div
            className="row"
            role="radiogroup"
            aria-label="Stagione"
            style={{
              gap: 0,
              border: '1px solid var(--stoku-border)',
              borderRadius: 'var(--r-sm)',
              padding: 2,
              height: 32,
              alignItems: 'stretch',
            }}
          >
            {SEASONS.map((s) => {
              const active = values.season === s.value;
              return (
                <button
                  key={s.value || 'all'}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    const next = { ...values, season: s.value };
                    setValues(next);
                    router.push(buildHref(next));
                  }}
                  style={{
                    flex: 1,
                    padding: '0 8px',
                    fontSize: 12,
                    border: 'none',
                    borderRadius: 'var(--r-xs)',
                    background: active ? 'var(--panel-2)' : 'transparent',
                    color: active ? 'var(--ink-1)' : 'var(--ink-3)',
                    fontWeight: active ? 500 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </label>

        <label className="col" style={{ gap: 4, width: 140 }}>
          <span className="meta" style={{ fontSize: 11 }}>BATTISTRADA MIN (mm)</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min={0}
            max={20}
            value={values.treadMin}
            onChange={(e) => update('treadMin', e.target.value)}
            className="stoku-input"
            style={{ height: 32, padding: '0 10px' }}
            placeholder="3.0"
          />
        </label>

        <label className="col" style={{ gap: 4, width: 140 }}>
          <span className="meta" style={{ fontSize: 11 }}>DOT NON OLTRE</span>
          <select
            value={values.dotMax}
            onChange={(e) => {
              const next = { ...values, dotMax: e.target.value };
              setValues(next);
              router.push(buildHref(next));
            }}
            className="stoku-input"
            style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
          >
            <option value="">Qualsiasi</option>
            {DOT_YEARS.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label
          className="row"
          style={{
            gap: 6,
            alignItems: 'center',
            height: 32,
            paddingLeft: 4,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={values.set4}
            onChange={(e) => {
              const next = { ...values, set4: e.target.checked };
              setValues(next);
              router.push(buildHref(next));
            }}
          />
          <span style={{ fontSize: 12 }}>Solo set di 4</span>
        </label>
      </div>
    </form>
  );
}
