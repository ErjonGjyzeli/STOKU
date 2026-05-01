// Deterministic IT formatters (server + client identical).
// Node ICU may lack `it-IT` locale data → Intl/toLocaleString fall back to
// raw output server-side while browsers format correctly. Causes hydration
// mismatches and inconsistent UX. Format manually instead.

const PLACEHOLDER = '—';

const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  ALL: 'L',
};

const MONTHS_SHORT_IT = [
  'gen', 'feb', 'mar', 'apr', 'mag', 'giu',
  'lug', 'ago', 'set', 'ott', 'nov', 'dic',
];

const MONTHS_LONG_IT = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

// Sunday=0
const WEEKDAYS_LONG_IT = [
  'domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato',
];

function thousands(input: string): string {
  return input.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return PLACEHOLDER;
  const sign = n < 0 ? '-' : '';
  return sign + thousands(String(Math.trunc(Math.abs(n))));
}

export function formatDecimal(
  n: number | null | undefined,
  decimals = 2,
): string {
  if (n == null || !Number.isFinite(n)) return PLACEHOLDER;
  const sign = n < 0 ? '-' : '';
  const fixed = Math.abs(n).toFixed(decimals);
  if (decimals === 0) return sign + thousands(fixed);
  const [int, frac] = fixed.split('.');
  return `${sign}${thousands(int)},${frac}`;
}

export function formatCurrency(
  value: number | null | undefined,
  code: string | null | undefined = 'EUR',
): string {
  if (value == null || !Number.isFinite(value)) return PLACEHOLDER;
  const c = (code ?? 'EUR').toUpperCase();
  const symbol = CURRENCY_SYMBOL[c] ?? c;
  return `${formatDecimal(value, 2)} ${symbol}`;
}

function toDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  const d = typeof input === 'string' ? new Date(input) : input;
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(input: string | Date | null | undefined): string {
  const d = toDate(input);
  if (!d) return PLACEHOLDER;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function formatDateTime(
  input: string | Date | null | undefined,
  opts?: { shortYear?: boolean },
): string {
  const d = toDate(input);
  if (!d) return PLACEHOLDER;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const year = opts?.shortYear
    ? String(d.getFullYear()).slice(-2)
    : String(d.getFullYear());
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${year} ${hh}:${min}`;
}

// "1 mag 2026" — long date without time.
export function formatDateLong(
  input: string | Date | null | undefined,
): string {
  const d = toDate(input);
  if (!d) return PLACEHOLDER;
  return `${d.getDate()} ${MONTHS_SHORT_IT[d.getMonth()]} ${d.getFullYear()}`;
}

// "1 mag 2026, 14:30" — used in order/transfer detail headers.
export function formatDateTimeLong(
  input: string | Date | null | undefined,
): string {
  const d = toDate(input);
  if (!d) return PLACEHOLDER;
  const day = d.getDate();
  const month = MONTHS_SHORT_IT[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hh}:${min}`;
}

// "1 mag" — used in relative-time fallbacks.
export function formatDayMonthShort(
  input: string | Date | null | undefined,
): string {
  const d = toDate(input);
  if (!d) return PLACEHOLDER;
  return `${d.getDate()} ${MONTHS_SHORT_IT[d.getMonth()]}`;
}

// "venerdì 1 maggio" — dashboard greeting label.
export function formatWeekdayDayMonth(
  input: string | Date | null | undefined,
): string {
  const d = toDate(input);
  if (!d) return PLACEHOLDER;
  const weekday = WEEKDAYS_LONG_IT[d.getDay()];
  const month = MONTHS_LONG_IT[d.getMonth()];
  return `${weekday} ${d.getDate()} ${month}`;
}
