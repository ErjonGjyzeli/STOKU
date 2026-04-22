import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogoutButton } from '@/components/layout/logout-button';
import { StoreSwitcher } from '@/components/layout/store-switcher';
import type { StoreLite } from '@/lib/auth/session';

type Props = {
  email: string;
  fullName: string | null;
  role: 'admin' | 'sales' | 'warehouse' | 'viewer';
  stores: StoreLite[];
};

const ROLE_LABEL: Record<Props['role'], string> = {
  admin: 'Admin',
  sales: 'Vendite',
  warehouse: 'Magazzino',
  viewer: 'Visualizzatore',
};

export function Topbar({ email, fullName, role, stores }: Props) {
  const initials = (fullName ?? email)
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="bg-background sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b px-4">
      <div className="flex items-center gap-3">
        <StoreSwitcher stores={stores} />
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="secondary">{ROLE_LABEL[role]}</Badge>
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback>{initials || 'U'}</AvatarFallback>
          </Avatar>
          <div className="hidden text-xs leading-tight md:block">
            <div className="font-medium">{fullName ?? email}</div>
            {fullName && <div className="text-muted-foreground">{email}</div>}
          </div>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
