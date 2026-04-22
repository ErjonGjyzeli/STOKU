'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './icon';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'primary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconEnd?: IconName;
  kbd?: string;
  children?: React.ReactNode;
  block?: boolean;
};

export const StokuButton = forwardRef<HTMLButtonElement, Props>(function StokuButton(
  {
    className,
    variant = 'default',
    size = 'md',
    icon,
    iconEnd,
    kbd,
    children,
    block,
    type,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(
        'btn',
        variant === 'primary' && 'primary',
        variant === 'ghost' && 'ghost',
        variant === 'danger' && 'danger',
        size === 'sm' && 'sm',
        size === 'lg' && 'lg',
        block && 'w-full justify-center',
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 12 : 14} />}
      {children}
      {iconEnd && <Icon name={iconEnd} size={size === 'sm' ? 12 : 14} />}
      {kbd && <span className="kbd ml-1">{kbd}</span>}
    </button>
  );
});
