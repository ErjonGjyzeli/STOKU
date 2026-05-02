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
import type { CreateUserInput, UpdateUserInput } from './actions';
import type { Role, StoreLite } from './users-client';

const createSchema = z.object({
  email: z.string().email('Email e pavlefshme'),
  full_name: z.string().min(2),
  role: z.enum(['admin', 'sales', 'warehouse', 'viewer']),
  password: z.string().min(8),
  store_ids: z.array(z.number()),
});

const editSchema = z.object({
  email: z.string(),
  full_name: z.string().min(2),
  role: z.enum(['admin', 'sales', 'warehouse', 'viewer']),
  is_active: z.boolean(),
  store_ids: z.array(z.number()),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

type Props =
  | {
      mode: 'create';
      open: boolean;
      onOpenChange: (o: boolean) => void;
      stores: StoreLite[];
      initial?: undefined;
      onSubmitCreate: (v: CreateUserInput) => Promise<boolean>;
      onSubmitUpdate: (v: UpdateUserInput) => Promise<boolean>;
    }
  | {
      mode: 'edit';
      open: boolean;
      onOpenChange: (o: boolean) => void;
      stores: StoreLite[];
      initial: {
        email: string;
        full_name: string;
        role: Role;
        is_active: boolean;
        store_ids: number[];
      };
      onSubmitCreate: (v: CreateUserInput) => Promise<boolean>;
      onSubmitUpdate: (v: UpdateUserInput) => Promise<boolean>;
    };

export function UserFormDialog(props: Props) {
  if (props.mode === 'create') return <CreateForm {...props} />;
  return <EditFormInner {...props} />;
}

function CreateForm({
  open,
  onOpenChange,
  stores,
  onSubmitCreate,
}: Extract<Props, { mode: 'create' }>) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: '', full_name: '', role: 'sales', password: '', store_ids: [] },
  });

  useEffect(() => {
    if (open) reset({ email: '', full_name: '', role: 'sales', password: '', store_ids: [] });
  }, [open, reset]);

  async function submit(values: CreateForm) {
    setSubmitting(true);
    const ok = await onSubmitCreate(values);
    setSubmitting(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Përdorues i ri</DialogTitle>
          <DialogDescription>
            Përdoruesi do të marrë qasje menjëherë me fjalëkalimin e caktuar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <Field label="Emri i plotë" error={errors.full_name?.message}>
            <Input {...register('full_name')} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="off" {...register('email')} />
          </Field>
          <Field label="Fjalëkalimi fillestar" error={errors.password?.message}>
            <Input type="text" autoComplete="off" {...register('password')} />
          </Field>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Field label="Roli" error={errors.role?.message}>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="sales">Shitje</SelectItem>
                    <SelectItem value="warehouse">Magazina</SelectItem>
                    <SelectItem value="viewer">Vëzhgues</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Controller
            control={control}
            name="store_ids"
            render={({ field }) => (
              <StoreCheckList stores={stores} selected={field.value} onChange={field.onChange} />
            )}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Anulo
            </Button>
            <Button type="submit" disabled={submitting}>
              Krijo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditFormInner({
  open,
  onOpenChange,
  stores,
  initial,
  onSubmitUpdate,
}: Extract<Props, { mode: 'edit' }>) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: initial,
  });

  useEffect(() => {
    if (open) reset(initial);
  }, [open, initial, reset]);

  async function submit(values: EditForm) {
    setSubmitting(true);
    const ok = await onSubmitUpdate({
      full_name: values.full_name,
      role: values.role,
      is_active: values.is_active,
      store_ids: values.store_ids,
    });
    setSubmitting(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifiko përdoruesin</DialogTitle>
          <DialogDescription>{initial.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <Field label="Emri i plotë" error={errors.full_name?.message}>
            <Input {...register('full_name')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Field label="Roli" error={errors.role?.message}>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="sales">Shitje</SelectItem>
                      <SelectItem value="warehouse">Magazina</SelectItem>
                      <SelectItem value="viewer">Vëzhgues</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <Field label="Statusi">
                  <Select
                    value={field.value ? '1' : '0'}
                    onValueChange={(v) => field.onChange(v === '1')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Aktiv</SelectItem>
                      <SelectItem value="0">Çaktivizuar</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>
          <Controller
            control={control}
            name="store_ids"
            render={({ field }) => (
              <StoreCheckList stores={stores} selected={field.value} onChange={field.onChange} />
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

function StoreCheckList({
  stores,
  selected,
  onChange,
}: {
  stores: StoreLite[];
  selected: number[];
  onChange: (v: number[]) => void;
}) {
  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }
  return (
    <div className="flex flex-col gap-2">
      <Label>Qasja në pikat e shitjes</Label>
      <p className="text-muted-foreground text-xs">
        Admin ka qasje në të gjitha dhe nuk kërkon zgjedhje.
      </p>
      <div className="flex flex-wrap gap-2">
        {stores.map((s) => {
          const active = selected.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className={
                'rounded-md border px-2.5 py-1 text-xs transition-colors ' +
                (active
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted')
              }
            >
              {s.code} <span className="text-muted-foreground">{s.name}</span>
            </button>
          );
        })}
      </div>
    </div>
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
