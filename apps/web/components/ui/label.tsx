'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn(
        // DESIGN.md: label form 11px uppercase tracking 0.05em color ink-3.
        'flex select-none items-center gap-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[color:var(--ink-3)] leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
