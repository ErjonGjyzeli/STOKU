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
  draft: 'Draft',
  confirmed: 'Konfirmuar',
  paid: 'Paguar',
  shipped: 'Dërguar',
  completed: 'Kompletuar',
  cancelled: 'Anuluar',
};

export const STATUS_ACTION_LABEL: Record<string, string> = {
  confirmed: 'Konfirmo (dekrement stokun)',
  paid: 'Shëno si paguar',
  shipped: 'Shëno si dërguar',
  completed: 'Kompletuar',
  cancelled: 'Anulo porosinë',
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
