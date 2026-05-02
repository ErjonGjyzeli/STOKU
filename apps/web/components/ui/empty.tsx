import type { ReactNode } from 'react';
import { Icon, type IconName } from './icon';

type Props = {
  icon?: IconName;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
};

export function Empty({ icon = 'box', title, subtitle, action }: Props) {
  return (
    <div
      className="col"
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '48px 16px',
        color: 'var(--ink-3)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'var(--panel-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-4)',
        }}
      >
        <Icon name={icon} size={18} />
      </div>
      <div style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{title}</div>
      {subtitle && (
        <div className="meta" style={{ maxWidth: 360, fontSize: 11 }}>
          {subtitle}
        </div>
      )}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}
