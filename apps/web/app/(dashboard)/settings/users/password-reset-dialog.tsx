'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StaffRow } from './users-client';

type Props = {
  user: StaffRow;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (password: string) => Promise<boolean>;
};

export function PasswordResetDialog({ user, open, onOpenChange, onSubmit }: Props) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const ok = await onSubmit(password);
    setSubmitting(false);
    if (ok) {
      setPassword('');
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reimposta password</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>Nuova password</Label>
            <Input
              type="text"
              autoComplete="off"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="text-muted-foreground text-xs">Minimo 8 caratteri.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={submitting || password.length < 8}>
              Aggiorna
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
