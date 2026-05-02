import type { CSSProperties, ReactNode } from 'react';

type Props = {
  title?: ReactNode;
  right?: ReactNode;
  padded?: boolean;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
};

export function Panel({ title, right, padded = true, children, style, className }: Props) {
  return (
    <section
      className={className}
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--stoku-border)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {title && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid var(--stoku-border)',
            background: 'var(--panel)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--ink-3)',
            }}
          >
            {title}
          </div>
          {right && (
            <div className="row" style={{ gap: 6 }}>
              {right}
            </div>
          )}
        </header>
      )}
      <div
        style={
          padded
            ? { padding: 14 }
            : { overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
        }
      >
        {children}
      </div>
    </section>
  );
}
