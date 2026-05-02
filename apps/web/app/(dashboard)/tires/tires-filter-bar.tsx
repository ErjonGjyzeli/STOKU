'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Icon } from '@/components/ui/icon';

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
  availableWidths: number[];
  availableAspects: number[];
  availableDiameters: number[];
};

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

const SEASONS: Array<{ value: TiresFilters['season']; label: string }> = [
  { value: '', label: 'Tutte' },
  { value: 'summer', label: '☀ Estate' },
  { value: 'winter', label: '❄ Inverno' },
  { value: 'allseason', label: '◐ 4 Stagioni' },
];

export function TiresFilterBar({
  initial,
  hasFilters,
  availableWidths,
  availableAspects,
  availableDiameters,
}: Props) {
  const router = useRouter();
  const [values, setValues] = useState<TiresFilters>(initial);

  function update<K extends keyof TiresFilters>(key: K, value: TiresFilters[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function nav(next: TiresFilters) {
    setValues(next);
    router.push(buildHref(next));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push(buildHref(values));
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
    >
      {/* Search */}
      <div className="stoku-input" style={{ width: 200, height: 28 }}>
        <Icon name="search" size={13} />
        <input
          type="search"
          value={values.q}
          onChange={(e) => update('q', e.target.value)}
          placeholder="Cerca…"
          autoComplete="off"
        />
      </div>

      {/* Width / Aspect / Diameter */}
      <div className="stoku-input" style={{ width: 80, height: 28 }}>
        <select value={values.width} onChange={(e) => update('width', e.target.value)}>
          <option value="">Larg.</option>
          {availableWidths.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>
      <span className="meta" style={{ fontSize: 12 }}>/</span>
      <div className="stoku-input" style={{ width: 70, height: 28 }}>
        <select value={values.aspect} onChange={(e) => update('aspect', e.target.value)}>
          <option value="">Prof.</option>
          {availableAspects.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      <span className="meta" style={{ fontSize: 12 }}>R</span>
      <div className="stoku-input" style={{ width: 70, height: 28 }}>
        <select value={values.diameter} onChange={(e) => update('diameter', e.target.value)}>
          <option value="">Diam.</option>
          {availableDiameters.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Season */}
      <div
        className="row"
        style={{ gap: 0, border: '1px solid var(--stoku-border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}
      >
        {SEASONS.map((s, i) => (
          <button
            key={s.value || 'all'}
            type="button"
            onClick={() => nav({ ...values, season: s.value })}
            className={values.season === s.value ? 'btn primary sm' : 'btn ghost sm'}
            style={{ borderRadius: 0, borderLeft: i > 0 ? '1px solid var(--stoku-border)' : 'none' }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Tread min */}
      <label className="row meta" style={{ gap: 4, fontSize: 11 }}>
        Battist. ≥
        <input
          type="number"
          value={values.treadMin}
          onChange={(e) => update('treadMin', e.target.value)}
          style={{
            width: 40,
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            border: '1px solid var(--stoku-border)',
            borderRadius: 3,
            padding: '2px 4px',
          }}
          placeholder="0"
        />
        mm
      </label>

      {/* DOT max */}
      <label className="row meta" style={{ gap: 4, fontSize: 11 }}>
        DOT ≤
        <input
          type="number"
          value={values.dotMax}
          onChange={(e) => update('dotMax', e.target.value)}
          style={{
            width: 52,
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            border: '1px solid var(--stoku-border)',
            borderRadius: 3,
            padding: '2px 4px',
          }}
          placeholder={String(new Date().getFullYear())}
        />
      </label>

      {/* Set 4 */}
      <label className="row" style={{ gap: 4, fontSize: 11 }}>
        <input
          type="checkbox"
          checked={values.set4}
          onChange={(e) => nav({ ...values, set4: e.target.checked })}
        />
        Set ≥4
      </label>

      <button type="submit" className="btn ghost sm">
        <Icon name="filter" size={12} />
      </button>

      {hasFilters && (
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => nav({ q: '', width: '', aspect: '', diameter: '', season: '', treadMin: '', dotMax: '', set4: false })}
        >
          Reset
        </button>
      )}
    </form>
  );
}
