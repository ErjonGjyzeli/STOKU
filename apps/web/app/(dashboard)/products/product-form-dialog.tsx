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
import type { ProductInput } from './actions';

const schema = z.object({
  sku: z.string().optional().or(z.literal('')),
  name: z.string().min(2, 'Nome minimo 2 caratteri'),
  legacy_nr: z.string().optional().or(z.literal('')),
  category_id: z.string().optional().or(z.literal('')),
  condition: z.enum(['new', 'used', 'refurbished', 'damaged']),
  price_sell: z.string().optional().or(z.literal('')),
  price_cost: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  is_active: z.boolean(),
  vehicle_make: z.string().optional().or(z.literal('')),
  vehicle_model: z.string().optional().or(z.literal('')),
  vehicle_year_from: z.string().optional().or(z.literal('')),
  vehicle_year_to: z.string().optional().or(z.literal('')),
  oem_code: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

type Category = { id: number; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProductInput) => Promise<boolean>;
  title: string;
  categories: Category[];
  initial?: FormValues;
};

const EMPTY: FormValues = {
  sku: '',
  name: '',
  legacy_nr: '',
  category_id: '',
  condition: 'used',
  price_sell: '',
  price_cost: '',
  description: '',
  is_active: true,
  vehicle_make: '',
  vehicle_model: '',
  vehicle_year_from: '',
  vehicle_year_to: '',
  oem_code: '',
};

export function ProductFormDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  categories,
  initial,
}: Props) {
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
    const payload: ProductInput = {
      sku: values.sku ?? '',
      name: values.name,
      legacy_nr: values.legacy_nr ?? '',
      category_id: values.category_id && values.category_id !== '_none' ? values.category_id : null,
      condition: values.condition,
      price_sell: values.price_sell ?? '',
      price_cost: values.price_cost ?? '',
      description: values.description ?? '',
      is_active: values.is_active,
      vehicle_make: values.vehicle_make ?? '',
      vehicle_model: values.vehicle_model ?? '',
      vehicle_year_from: values.vehicle_year_from ?? '',
      vehicle_year_to: values.vehicle_year_to ?? '',
      oem_code: values.oem_code ?? '',
    };
    const ok = await onSubmit(payload);
    setSubmitting(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Dati del ricambio. Lascia vuoto lo SKU per assegnarlo automaticamente (P-000001…).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU" error={errors.sku?.message}>
              <Input {...register('sku')} placeholder="Auto" />
            </Field>
            <Field label="Num. ex-Excel" error={errors.legacy_nr?.message}>
              <Input {...register('legacy_nr')} placeholder="5920" />
            </Field>
          </div>

          <Field label="Nome" error={errors.name?.message}>
            <Input {...register('name')} placeholder="Centralina ABS Audi A4 B7" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Field label="Categoria" error={errors.category_id?.message}>
                  <Select value={field.value || '_none'} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Nessuna</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Controller
              control={control}
              name="condition"
              render={({ field }) => (
                <Field label="Condizione" error={errors.condition?.message}>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Nuovo</SelectItem>
                      <SelectItem value="used">Usato</SelectItem>
                      <SelectItem value="refurbished">Rigenerato</SelectItem>
                      <SelectItem value="damaged">Danneggiato</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prezzo vendita (€)" error={errors.price_sell?.message}>
              <Input {...register('price_sell')} inputMode="decimal" placeholder="120,00" />
            </Field>
            <Field label="Prezzo costo (€)" error={errors.price_cost?.message}>
              <Input {...register('price_cost')} inputMode="decimal" placeholder="80,00" />
            </Field>
          </div>

          <Field label="Descrizione" error={errors.description?.message}>
            <textarea
              {...register('description')}
              className="stoku-input"
              style={{ minHeight: 72, padding: 8, width: '100%', resize: 'vertical' }}
              rows={3}
              placeholder="Anno, modello, note compatibilità…"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca auto" error={errors.vehicle_make?.message}>
              <Input {...register('vehicle_make')} placeholder="Audi" />
            </Field>
            <Field label="Modello" error={errors.vehicle_model?.message}>
              <Input {...register('vehicle_model')} placeholder="A4 B7" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Anno da" error={errors.vehicle_year_from?.message}>
              <Input
                {...register('vehicle_year_from')}
                inputMode="numeric"
                placeholder="2004"
              />
            </Field>
            <Field label="Anno a" error={errors.vehicle_year_to?.message}>
              <Input
                {...register('vehicle_year_to')}
                inputMode="numeric"
                placeholder="2008"
              />
            </Field>
          </div>

          <Field label="Codice OEM" error={errors.oem_code?.message}>
            <Input {...register('oem_code')} placeholder="0265 800 1234" />
          </Field>

          <label className="row" style={{ gap: 8, fontSize: 12, color: 'var(--ink-2)' }}>
            <input type="checkbox" {...register('is_active')} />
            Prodotto attivo (visibile in vendita)
          </label>

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

export type { FormValues as ProductFormValues };
