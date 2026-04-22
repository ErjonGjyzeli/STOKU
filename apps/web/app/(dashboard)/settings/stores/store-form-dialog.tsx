'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StoreInput } from './actions';

const schema = z.object({
  code: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9]+$/, 'Solo maiuscole e numeri'),
  name: z.string().min(2),
  type: z.enum(['shop', 'warehouse', 'mixed']),
  city: z.string().nullable().optional(),
  country: z.string().length(2, 'Codice ISO 2 lettere').nullable().optional().or(z.literal('')),
  address_line1: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email('Email non valida').nullable().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: StoreInput) => Promise<boolean>;
  title: string;
  initial?: StoreInput;
};

const EMPTY: FormValues = {
  code: '',
  name: '',
  type: 'shop',
  city: '',
  country: 'AL',
  address_line1: '',
  postal_code: '',
  phone: '',
  email: '',
};

export function StoreFormDialog({ open, onOpenChange, onSubmit, title, initial }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? EMPTY,
  });

  useEffect(() => {
    if (open) reset(initial ?? EMPTY);
  }, [open, initial, reset]);

  async function submit(values: FormValues) {
    setSubmitting(true);
    const ok = await onSubmit(values as StoreInput);
    setSubmitting(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Dati punto vendita.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Codice" error={errors.code?.message}>
              <Input {...register('code')} placeholder="TIR01" />
            </Field>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Field label="Tipo" error={errors.type?.message}>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shop">Negozio</SelectItem>
                      <SelectItem value="warehouse">Magazzino</SelectItem>
                      <SelectItem value="mixed">Misto</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>
          <Field label="Nome" error={errors.name?.message}>
            <Input {...register('name')} />
          </Field>
          <Field label="Indirizzo" error={errors.address_line1?.message}>
            <Input {...register('address_line1')} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="CAP" error={errors.postal_code?.message}>
              <Input {...register('postal_code')} />
            </Field>
            <Field label="Città" error={errors.city?.message}>
              <Input {...register('city')} />
            </Field>
            <Field label="Paese (ISO)" error={errors.country?.message}>
              <Input {...register('country')} maxLength={2} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefono" error={errors.phone?.message}>
              <Input {...register('phone')} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...register('email')} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={submitting}>
              Salva
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
