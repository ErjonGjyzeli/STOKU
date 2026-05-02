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
import type { TireInput } from './actions';

const SPEED_INDEXES = ['Q', 'R', 'S', 'T', 'H', 'V', 'W', 'Y', 'ZR'] as const;

const schema = z.object({
  sku: z.string().optional().or(z.literal('')),
  name: z.string().min(2, 'Nome minimo 2 caratteri'),
  category_id: z.string().min(1, 'Stagione obbligatoria'),
  condition: z.enum(['new', 'used', 'refurbished', 'damaged']),
  vehicle_make: z.string().min(1, 'Marca obbligatoria'),
  vehicle_model: z.string().optional().or(z.literal('')),
  price_sell: z.string().optional().or(z.literal('')),
  price_cost: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  tire_width: z.string().min(1, 'Larghezza obbligatoria'),
  tire_aspect: z.string().min(1, 'Spalla obbligatoria'),
  tire_diameter: z.string().min(1, 'Diametro obbligatorio'),
  tire_load_index: z.string().optional().or(z.literal('')),
  tire_speed_index: z.string().optional().or(z.literal('')),
  tire_tread_mm: z.string().optional().or(z.literal('')),
  tire_dot: z.string().optional().or(z.literal('')),
  tire_runflat: z.boolean(),
  tire_reinforced: z.boolean(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

type Category = { id: number; name: string; slug: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TireInput) => Promise<boolean>;
  title: string;
  categories: Category[];
};

const EMPTY: FormValues = {
  sku: '',
  name: '',
  category_id: '',
  condition: 'new',
  vehicle_make: '',
  vehicle_model: '',
  price_sell: '',
  price_cost: '',
  description: '',
  tire_width: '',
  tire_aspect: '',
  tire_diameter: '',
  tire_load_index: '',
  tire_speed_index: '',
  tire_tread_mm: '',
  tire_dot: '',
  tire_runflat: false,
  tire_reinforced: false,
  is_active: true,
};

export function TireFormDialog({ open, onOpenChange, onSubmit, title, categories }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) reset(EMPTY);
  }, [open, reset]);

  async function submit(values: FormValues) {
    setSubmitting(true);
    const payload: TireInput = {
      sku: values.sku ?? '',
      name: values.name,
      category_id: values.category_id,
      condition: values.condition,
      vehicle_make: values.vehicle_make,
      vehicle_model: values.vehicle_model ?? '',
      price_sell: values.price_sell ?? '',
      price_cost: values.price_cost ?? '',
      description: values.description ?? '',
      tire_width: values.tire_width,
      tire_aspect: values.tire_aspect,
      tire_diameter: values.tire_diameter,
      tire_load_index: values.tire_load_index ?? '',
      tire_speed_index: values.tire_speed_index ?? '',
      tire_tread_mm: values.tire_tread_mm ?? '',
      tire_dot: values.tire_dot ?? '',
      tire_runflat: values.tire_runflat,
      tire_reinforced: values.tire_reinforced,
      is_active: values.is_active,
    };
    const ok = await onSubmit(payload);
    setSubmitting(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Misura, marca e stagione obbligatori. Lascia vuoto lo SKU per assegnarlo
            automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU" error={errors.sku?.message}>
              <Input {...register('sku')} placeholder="Auto" />
            </Field>
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

          <Field label="Nome / descrizione breve" error={errors.name?.message}>
            <Input {...register('name')} placeholder="Es. Michelin Primacy 4 205/55 R16" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca" error={errors.vehicle_make?.message}>
              <Input {...register('vehicle_make')} placeholder="Michelin" />
            </Field>
            <Field label="Modello" error={errors.vehicle_model?.message}>
              <Input {...register('vehicle_model')} placeholder="Primacy 4" />
            </Field>
          </div>

          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <Field label="Stagione" error={errors.category_id?.message}>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
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

          <div className="grid grid-cols-3 gap-3">
            <Field label="Larghezza" error={errors.tire_width?.message}>
              <Input
                {...register('tire_width')}
                inputMode="numeric"
                placeholder="205"
              />
            </Field>
            <Field label="Spalla" error={errors.tire_aspect?.message}>
              <Input
                {...register('tire_aspect')}
                inputMode="numeric"
                placeholder="55"
              />
            </Field>
            <Field label="Diametro (R)" error={errors.tire_diameter?.message}>
              <Input
                {...register('tire_diameter')}
                inputMode="decimal"
                placeholder="16"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Indice carico" error={errors.tire_load_index?.message}>
              <Input
                {...register('tire_load_index')}
                inputMode="numeric"
                placeholder="91"
              />
            </Field>
            <Controller
              control={control}
              name="tire_speed_index"
              render={({ field }) => (
                <Field label="Indice velocità" error={errors.tire_speed_index?.message}>
                  <Select
                    value={field.value || '_none'}
                    onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Nessuno</SelectItem>
                      {SPEED_INDEXES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Battistrada (mm)" error={errors.tire_tread_mm?.message}>
              <Input
                {...register('tire_tread_mm')}
                inputMode="decimal"
                placeholder="7.5"
              />
            </Field>
            <Field label="DOT" error={errors.tire_dot?.message}>
              <Input {...register('tire_dot')} placeholder="2324" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prezzo vendita (€)" error={errors.price_sell?.message}>
              <Input {...register('price_sell')} inputMode="decimal" placeholder="120,00" />
            </Field>
            <Field label="Prezzo costo (€)" error={errors.price_cost?.message}>
              <Input {...register('price_cost')} inputMode="decimal" placeholder="80,00" />
            </Field>
          </div>

          <Field label="Note" error={errors.description?.message}>
            <textarea
              {...register('description')}
              className="stoku-input"
              style={{ minHeight: 60, padding: 8, width: '100%', resize: 'vertical' }}
              rows={2}
              placeholder="Note compatibilità, stato usura, etc."
            />
          </Field>

          <div className="row" style={{ gap: 16, fontSize: 11 }}>
            <label className="row" style={{ gap: 6 }}>
              <input type="checkbox" {...register('tire_runflat')} />
              Runflat
            </label>
            <label className="row" style={{ gap: 6 }}>
              <input type="checkbox" {...register('tire_reinforced')} />
              Rinforzata
            </label>
            <label className="row" style={{ gap: 6, marginLeft: 'auto' }}>
              <input type="checkbox" {...register('is_active')} />
              Attivo
            </label>
          </div>

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
