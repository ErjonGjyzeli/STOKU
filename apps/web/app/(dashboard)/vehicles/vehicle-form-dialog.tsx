'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
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
import { createMake, type VehicleInput } from './actions';

const schema = z.object({
  make_id: z.string().min(1, 'Seleziona una marca'),
  model: z.string().min(1, 'Modello obbligatorio'),
  chassis_code: z.string().optional().or(z.literal('')),
  year_from: z.string().optional().or(z.literal('')),
  year_to: z.string().optional().or(z.literal('')),
  engine: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export type Make = { id: number; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: VehicleInput) => Promise<boolean>;
  title: string;
  makes: Make[];
  onMakeCreated: (make: Make) => void;
  initial?: FormValues;
};

const EMPTY: FormValues = {
  make_id: '',
  model: '',
  chassis_code: '',
  year_from: '',
  year_to: '',
  engine: '',
};

export function VehicleFormDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  makes,
  onMakeCreated,
  initial,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [addingMake, setAddingMake] = useState(false);
  const [newMake, setNewMake] = useState('');
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
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
    const payload: VehicleInput = {
      make_id: values.make_id,
      model: values.model,
      chassis_code: values.chassis_code ?? '',
      year_from: values.year_from ?? '',
      year_to: values.year_to ?? '',
      engine: values.engine ?? '',
    };
    const ok = await onSubmit(payload);
    setSubmitting(false);
    if (ok) onOpenChange(false);
  }

  async function handleAddMake() {
    const trimmed = newMake.trim();
    if (trimmed.length < 2) {
      toast.error('Nome marca troppo corto');
      return;
    }
    setAddingMake(true);
    const res = await createMake(trimmed);
    setAddingMake(false);
    if (!res.ok) {
      toast.error('Errore', { description: res.error });
      return;
    }
    const newEntry = { id: res.data.id, name: trimmed };
    onMakeCreated(newEntry);
    setValue('make_id', String(newEntry.id));
    setNewMake('');
    toast.success('Marca aggiunta');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Anno e codice telaio sono opzionali, vengono usati per filtri e compatibilità.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <Controller
            control={control}
            name="make_id"
            render={({ field }) => (
              <Field label="Marca" error={errors.make_id?.message}>
                <div className="flex items-center gap-2">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleziona marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {makes.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    placeholder="+ Nuova marca"
                    value={newMake}
                    onChange={(e) => setNewMake(e.target.value)}
                    disabled={addingMake}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleAddMake}
                    disabled={addingMake || newMake.trim().length < 2}
                  >
                    Aggiungi
                  </Button>
                </div>
              </Field>
            )}
          />

          <Field label="Modello" error={errors.model?.message}>
            <Input {...register('model')} placeholder="A4 B7" />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Codice telaio" error={errors.chassis_code?.message}>
              <Input {...register('chassis_code')} placeholder="8E" />
            </Field>
            <Field label="Anno da" error={errors.year_from?.message}>
              <Input {...register('year_from')} inputMode="numeric" placeholder="2004" />
            </Field>
            <Field label="Anno a" error={errors.year_to?.message}>
              <Input {...register('year_to')} inputMode="numeric" placeholder="2008" />
            </Field>
          </div>

          <Field label="Motore" error={errors.engine?.message}>
            <Input {...register('engine')} placeholder="2.0 TDI" />
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

export type { FormValues as VehicleFormValues };
