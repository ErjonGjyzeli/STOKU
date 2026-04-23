// Dati statici condivisi tra server actions (orders/actions.ts) e
// componenti client (order-detail-client.tsx). Non può stare in
// actions.ts perché file 'use server' esporta solo async functions.

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Bozza',
  confirmed: 'Confermato',
  paid: 'Pagato',
  shipped: 'Spedito',
  completed: 'Completato',
  cancelled: 'Annullato',
};

export const STATUS_ACTION_LABEL: Record<string, string> = {
  confirmed: 'Conferma (decrementa stock)',
  paid: 'Segna pagato',
  shipped: 'Segna spedito',
  completed: 'Completato',
  cancelled: 'Annulla ordine',
};

export type OrderStatus =
  | 'draft'
  | 'confirmed'
  | 'paid'
  | 'shipped'
  | 'completed'
  | 'cancelled';

// Stati raggiungibili tramite transizione (draft è stato iniziale, non
// target di una transizione).
export type OrderTransitionStatus = Exclude<OrderStatus, 'draft'>;

export function allowedNextStatuses(current: string): OrderTransitionStatus[] {
  return (ALLOWED_TRANSITIONS[current] ?? []) as OrderTransitionStatus[];
}
