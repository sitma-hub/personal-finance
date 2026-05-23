/** Normalize YYYY-MM or YYYY-MM-DD to YYYY-MM. */
export function normalizeMonth(value: string | Date): string {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
  }
  const v = String(value).trim();
  if (/^\d{4}-\d{2}$/.test(v)) return v;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.substring(0, 7);
  return v.substring(0, 7);
}

/** Parse snapshot_month from DB/API. Returns null if invalid. */
export function normalizeSnapshotMonth(value: string | Date | unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
  }
  const v = String(value).trim();
  if (/^\d{4}-\d{2}$/.test(v)) return v;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.substring(0, 7);
  return null;
}

function isPlausibleMonth(yyyyMM: string): boolean {
  const [yStr, mStr] = yyyyMM.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  return y >= 2000 && y <= 2100 && m >= 1 && m <= 12;
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function addMonths(yyyyMM: string, n: number): string {
  const month = normalizeMonth(yyyyMM);
  const [yStr, mStr] = month.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return yyyyMM;
  }
  const d = new Date(y, m - 1 + n, 1);
  if (Number.isNaN(d.getTime())) return yyyyMM;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthsBetween(fromMonth: string, toMonth: string): number {
  const from = normalizeMonth(fromMonth);
  const to = normalizeMonth(toMonth);
  const [y1Str, m1Str] = from.split('-');
  const [y2Str, m2Str] = to.split('-');
  const y1 = Number(y1Str);
  const m1 = Number(m1Str);
  const y2 = Number(y2Str);
  const m2 = Number(m2Str);
  if (!Number.isFinite(y1) || !Number.isFinite(m1) || !Number.isFinite(y2) || !Number.isFinite(m2)) {
    return 0;
  }
  return (y2 - y1) * 12 + (m2 - m1);
}

export function compareMonths(a: string, b: string): number {
  const diff = monthsBetween(a, b);
  if (diff === 0) return 0;
  return diff > 0 ? 1 : -1;
}

export function clampMonthToCurrent(month: string, current: string = currentMonth()): string {
  const m = normalizeMonth(month);
  const cur = normalizeMonth(current);
  return compareMonths(m, cur) > 0 ? cur : m;
}

export function assertNotFutureMonth(month: string, current: string = currentMonth()): void {
  if (compareMonths(normalizeMonth(month), normalizeMonth(current)) > 0) {
    throw new Error('Check-in is only available through the current month');
  }
}

export function monthToDateFirst(yyyyMM: string): string {
  return `${normalizeMonth(yyyyMM)}-01`;
}

const MAX_INTERNAL_GAP_MONTHS = 24;

export function findMissingSnapshotMonths(
  snapshotMonths: string[],
  throughMonth?: string
): string[] {
  const through = normalizeMonth(throughMonth ?? currentMonth());
  const existing = new Set(
    snapshotMonths
      .map((m) => normalizeSnapshotMonth(m))
      .filter((m): m is string => m != null && isPlausibleMonth(m) && compareMonths(m, through) <= 0)
  );

  if (existing.size === 0) {
    return [through];
  }

  const sorted = Array.from(existing).sort();
  const missing: string[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]!;
    const end = sorted[i + 1]!;
    if (monthsBetween(start, end) > MAX_INTERNAL_GAP_MONTHS) {
      continue;
    }
    let cursor = addMonths(start, 1);
    while (compareMonths(cursor, end) < 0) {
      missing.push(cursor);
      cursor = addMonths(cursor, 1);
    }
  }

  const last = sorted[sorted.length - 1]!;
  const recentCutoff = addMonths(through, -MAX_INTERNAL_GAP_MONTHS);
  const tailFrom = compareMonths(last, recentCutoff) < 0
    ? recentCutoff
    : addMonths(last, 1);

  let cursor = tailFrom;
  while (compareMonths(cursor, through) <= 0) {
    if (!existing.has(cursor)) {
      missing.push(cursor);
    }
    cursor = addMonths(cursor, 1);
  }

  return missing;
}

export function getRecommendedMonth(
  missingMonths: string[],
  snapshotMonths: string[],
  current: string = currentMonth()
): string {
  const cur = normalizeMonth(current);

  const firstMissing = missingMonths[0];
  if (firstMissing) return clampMonthToCurrent(firstMissing, cur);

  const existing = new Set(
    snapshotMonths
      .map((m) => normalizeSnapshotMonth(m))
      .filter((m): m is string => m != null && isPlausibleMonth(m))
  );
  if (!existing.has(cur)) return cur;

  return cur;
}
