export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const LIBRARY_START_YEAR = 2024;
export const LIBRARY_START_MONTH = 12;

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function isIsoDate(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= lastDay;
}

export function monthKeyFromDate(value: string | null): string | null {
  if (!isIsoDate(value)) {
    return null;
  }
  return value.slice(0, 7);
}

export function monthBounds(month: string): { from: string; to: string } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) {
    return null;
  }
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    from: `${match[1]}-${match[2]}-01`,
    to: `${match[1]}-${match[2]}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function nextMonth(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return month;
  }
  let year = Number(match[1]);
  let monthNumber = Number(match[2]) + 1;
  if (monthNumber > 12) {
    monthNumber = 1;
    year += 1;
  }
  return monthKey(year, monthNumber);
}

export function formatItemDate(value: string | null): string {
  if (!isIsoDate(value)) {
    return 'No date';
  }
  const monthIndex = Number(value.slice(5, 7)) - 1;
  const day = Number(value.slice(8, 10));
  const year = value.slice(0, 4);
  return `${MONTH_SHORT[monthIndex]} ${day}, ${year}`;
}

export function formatMonthKey(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return month;
  }
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    return month;
  }
  return `${MONTH_LONG[monthIndex]} ${match[1]}`;
}

export function shortMonth(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return month;
  }
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    return month;
  }
  return MONTH_SHORT[monthIndex];
}

export function shortYear(month: string): string {
  const match = /^(\d{4})-/.exec(month);
  if (!match) {
    return '';
  }
  return `’${match[1].slice(2)}`;
}

export function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatClock(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function isMonthSelectable(year: number, month: number, now: Date): boolean {
  const value = year * 12 + month;
  const start = LIBRARY_START_YEAR * 12 + LIBRARY_START_MONTH;
  const current = now.getFullYear() * 12 + (now.getMonth() + 1);
  return value >= start && value <= current;
}

export function availableYears(now: Date): number[] {
  const years: number[] = [];
  const end = Math.max(now.getFullYear(), LIBRARY_START_YEAR);
  for (let year = LIBRARY_START_YEAR; year <= end; year += 1) {
    years.push(year);
  }
  return years;
}
