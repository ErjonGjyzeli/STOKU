'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

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
import { Button } from '@/components/ui/button';
import type { ShelfInput } from './actions';

const CODE_REGEX = /^[A-Z0-9]+(-[A-Z0-9]+)*$/i;

// Schema lato client. `store_id` resta `number` perché il Controller forza
// la conversione (Select restituisce string, mappato a Number prima
// dell'onChange). Capacity resta string per evitare frizioni input HTML.
const schema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Kodi minimum 2 karaktere')
    .max(40, 'Kodi maksimum 40 karaktere')
    .regex(CODE_REGEX, 'Vetëm shkronja/shifra, blloqe të ndara me "-"'),
  store_id: z.number().int().positive('Zgjidh PV'),
  description: z.string().trim().max(200, 'Maksimum 200 karaktere').optional().or(z.literal('')),
  kind: z.enum(['open', 'cabinet', 'drawer', 'floor']),
  capacity: z.string().optional(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

type StoreOption = { id: number; code: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ShelfInput) => Promise<boolean>;
  title: string;
  stores: StoreOption[];
  defaultStoreId?: number | null;
  initial?: ShelfInput;
};

const KIND_LABEL: Record<FormValues['kind'], string> = {
  open: 'I hapur',
  cabinet: 'Kabineti',
  drawer: 'Sirtarët',
  floor: 'Dyshemeja',
};

function emptyValues(defaultStoreId: number | null | undefined): FormValues {
  return {
    code: '',
    store_id: defaultStoreId ?? 0,
    description: '',
    kind: 'open',
    capacity: '',
    is_active: true,
  };
}

function fromInput(initial: ShelfInput): FormValues {
  return {
    code: initial.code ?? '',
    store_id: Number(initial.store_id) || 0,
    description: (initial.description as string | null) ?? '',
    kind: initial.kind,
    capacity:
      initial.capacity === null || initial.capacity === undefined || initial.capacity === ''
        ? ''
        : String(initial.capacity),
    is_active: initial.is_active ?? true,
  };
}

export function ShelfFormDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  stores,
  defaultStoreId,
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
    defaultValues: initial ? fromInput(initial) : emptyValues(defaultStoreId),
  });

  useEffect(() => {
    if (open) reset(initial ? fromInput(initial) : emptyValues(defaultStoreId));
  }, [open, initial, defaultStoreId, reset]);

  async function submit(values: FormValues) {
    setSubmitting(true);
    const payload: ShelfInput = {
      code: values.code,
      store_id: values.store_id,
      description: values.description ?? '',
      kind: values.kind,
      capacity: values.capacity === '' ? null : values.capacity,
      is_active: values.is_active,
    };
    const ok = await onSubmit(payload);
    setSubmitting(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Kodi hierarkik p.sh. <code>TIR-A-12-3</code> ose <code>DUR-MAIN</code>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kodi" error={errors.code?.message}>
              <Input
                {...register('code')}
                placeholder="TIR-A-12-3"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </Field>
            <Controller
              control={control}
              name="store_id"
              render={({ field }) => (
                <Field label="Pika e shitjes" error={errors.store_id?.message}>
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Zgjidh PV" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.code} · {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>
          <Field label="Përshkrimi" error={errors.description?.message}>
            <Input {...register('description')} placeholder="P.sh. Korridor A, rrafti i lartë" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Controller
              control={control}
              name="kind"
              render={({ field }) => (
                <Field label="Tipi" error={errors.kind?.message}>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(KIND_LABEL) as Array<FormValues['kind']>).map((k) => (
                        <SelectItem key={k} value={k}>
                          {KIND_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Field label="Kapaciteti (opz.)" error={errors.capacity?.message}>
              <Input
                {...register('capacity')}
                inputMode="numeric"
                placeholder="p.sh. 50"
              />
            </Field>
          </div>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="row" style={{ gap: 8, alignItems: 'center', fontSize: 11 }}>
                <input
                  type="checkbox"
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                Aktiv
              </label>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Anulo
            </Button>
            <Button type="submit" disabled={submitting}>
              Ruaj
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
