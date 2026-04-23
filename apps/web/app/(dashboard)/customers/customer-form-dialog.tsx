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
import type { CustomerInput } from './actions';

const schema = z.object({
  code: z.string().optional().or(z.literal('')),
  type: z.enum(['private', 'business']),
  name: z.string().min(2, 'Nome minimo 2 caratteri'),
  vat_number: z.string().optional().or(z.literal('')),
  tax_code: z.string().optional().or(z.literal('')),
  email: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address_line1: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  postal_code: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CustomerInput) => Promise<boolean>;
  title: string;
  initial?: FormValues;
};

const EMPTY: FormValues = {
  code: '',
  type: 'private',
  name: '',
  vat_number: '',
  tax_code: '',
  email: '',
  phone: '',
  address_line1: '',
  city: '',
  postal_code: '',
  country: 'AL',
  notes: '',
};

export function CustomerFormDialog({ open, onOpenChange, onSubmit, title, initial }: Props) {
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
    const ok = await onSubmit(values as CustomerInput);
    setSubmitting(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Code auto se vuoto (C-000001…). Tipo business abilita NIPT / VAT / CF.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Code" error={errors.code?.message}>
              <Input {...register('code')} placeholder="Auto" />
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
                      <SelectItem value="private">Privato</SelectItem>
                      <SelectItem value="business">Azienda</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Field label="Paese (ISO)" error={errors.country?.message}>
              <Input {...register('country')} maxLength={2} placeholder="AL" />
            </Field>
          </div>

          <Field label="Nome / Ragione sociale" error={errors.name?.message}>
            <Input {...register('name')} placeholder="Mario Rossi o Alfa S.r.l." />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="NIPT / P.IVA" error={errors.vat_number?.message}>
              <Input {...register('vat_number')} placeholder="L12345678A" />
            </Field>
            <Field label="Codice fiscale" error={errors.tax_code?.message}>
              <Input {...register('tax_code')} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...register('email')} />
            </Field>
            <Field label="Telefono" error={errors.phone?.message}>
              <Input {...register('phone')} />
            </Field>
          </div>

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
          </div>

          <Field label="Note" error={errors.notes?.message}>
            <textarea
              {...register('notes')}
              className="stoku-input"
              style={{ minHeight: 60, padding: 8, width: '100%', resize: 'vertical' }}
              rows={2}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvataggio…' : 'Salva'}
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

export type { FormValues as CustomerFormValues };
