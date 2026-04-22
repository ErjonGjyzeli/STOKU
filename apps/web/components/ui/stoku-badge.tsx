import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'ok' | 'warn' | 'danger' | 'info' | 'draft' | 'accent';

type Props = HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant;
  dot?: boolean;
};

export function StokuBadge({ variant = 'default', dot, className, children, ...rest }: Props) {
  return (
    <span
      className={cn(
        'stoku-badge',
        variant === 'ok' && 'ok',
        variant === 'warn' && 'warn',
        variant === 'danger' && 'danger',
        variant === 'info' && 'info',
        variant === 'draft' && 'draft',
        variant === 'accent' && 'accent',
        className,
      )}
      {...rest}
    >
      {dot && (
        <span
          aria-hidden
          className="inline-block size-[6px] rounded-full"
          style={{ background: 'currentColor', opacity: 0.9 }}
        />
      )}
      {children}
    </span>
  );
}
