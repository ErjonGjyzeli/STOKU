import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  return (
    <form action="/auth/signout" method="post">
      <Button type="submit" variant="ghost" size="icon" aria-label="Esci">
        <LogOut className="size-4" />
      </Button>
    </form>
  );
}
