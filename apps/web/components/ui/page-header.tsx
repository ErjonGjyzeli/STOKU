import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from './icon';

type Crumb = { label: string; href?: string };

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  breadcrumb?: Crumb[];
};

export function PageHeader({ title, subtitle, right, breadcrumb }: Props) {
  return (
    <div
      className="page-header"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        padding: '20px 24px 16px',
        borderBottom: '1px solid var(--stoku-border)',
        background: 'var(--bg)',
        gap: 16,
      }}
    >
      <div className="col" style={{ gap: 4, minWidth: 0 }}>
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="row" style={{ gap: 4, fontSize: 12, color: 'var(--ink-3)' }}>
            {breadcrumb.map((b, i) => (
              <span key={`${b.label}-${i}`} className="row" style={{ gap: 4 }}>
                {i > 0 && <Icon name="chevronRight" size={11} />}
                {b.href ? (
                  <Link href={b.href} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {b.label}
                  </Link>
                ) : (
                  <span>{b.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <div className="meta" style={{ fontSize: 12 }}>
            {subtitle}
          </div>
        )}
      </div>
      {right && (
        <div className="row" style={{ gap: 8, flexShrink: 0 }}>
          {right}
        </div>
      )}
    </div>
  );
}
