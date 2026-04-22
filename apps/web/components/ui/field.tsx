import type { ReactNode } from 'react';

type Props = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
};

export function Field({ label, hint, error, htmlFor, children, className }: Props) {
  return (
    <label htmlFor={htmlFor} className={`col ${className ?? ''}`} style={{ gap: 4 }}>
      {label && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--ink-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </span>
      )}
      {children}
      {hint && (
        <span className="meta" style={{ fontSize: 11 }}>
          {hint}
        </span>
      )}
      {error && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{error}</span>}
    </label>
  );
}
