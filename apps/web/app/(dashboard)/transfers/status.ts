export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['in_transit', 'cancelled'],
  in_transit: ['completed'],
  completed: [],
  cancelled: [],
};

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  in_transit: 'Në tranzit',
  completed: 'Kompletuar',
  cancelled: 'Anuluar',
};

export const STATUS_ACTION_LABEL: Record<string, string> = {
  in_transit: 'Dërgoni (dekrement origjinën)',
  completed: 'Marrë (përditëso destinacionin)',
  cancelled: 'Anulo',
};

export type TransferStatus = 'draft' | 'in_transit' | 'completed' | 'cancelled';
export type TransferTransitionStatus = Exclude<TransferStatus, 'draft'>;

export function allowedNextStatuses(current: string): TransferTransitionStatus[] {
  return (ALLOWED_TRANSITIONS[current] ?? []) as TransferTransitionStatus[];
}
