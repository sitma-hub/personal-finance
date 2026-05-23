/** Normalize API date strings for `<input type="date">` (yyyy-MM-dd). */
export function toDateInputValue(value?: string | null): string {
    if (!value) return '';
    const v = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    if (v.includes('T')) return v.substring(0, 10);
    if (/^\d{4}-\d{2}$/.test(v)) return `${v}-01`;
    return v.substring(0, 10);
}

/** Parse YYYY-MM-DD or YYYY-MM in local calendar (avoids UTC day/month shifts). */
export function parseLocalCalendarDate(value?: string | null): Date | null {
    if (!value) return null;
    const v = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const [y, m, d] = v.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    if (/^\d{4}-\d{2}$/.test(v)) {
        const [y, m] = v.split('-').map(Number);
        const date = new Date(y, m - 1, 1);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
        const d = new Date(`${v.substring(0, 10)}T12:00:00`);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}

/** Full calendar date for tables/UI, e.g. "15 Jan 2026" (browser locale). */
export function formatLocaleDate(value?: string | null, fallback = '—'): string {
    if (!value) return fallback;
    const d = parseLocalCalendarDate(value);
    if (!d) return String(value);
    return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/** Month precision fields (YYYY-MM), e.g. "January 2026". */
export function formatLocaleMonth(value?: string | null, fallback = '—'): string {
    if (!value) return fallback;
    const d = parseLocalCalendarDate(value);
    if (!d) return formatChartMonthLabel(value) || String(value);
    return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
    });
}

/** Format YYYY-MM (or ISO date) for chart tooltips, e.g. "May 2026". */
export function formatChartMonthLabel(month?: string | null): string {
    if (!month) return '';
    const d = parseLocalCalendarDate(month);
    if (d) {
        const v = String(month).trim();
        if (/^\d{4}-\d{2}$/.test(v)) {
            return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        }
        return d.toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    }
    return String(month).trim();
}

/** Normalize API date strings for `<input type="month">` (yyyy-MM). */
export function toMonthInputValue(value?: string | null): string {
    if (!value) return '';
    const v = value.trim();
    if (/^\d{4}-\d{2}$/.test(v)) return v;
    if (v.includes('T')) return v.substring(0, 7);
    return v.length >= 7 ? v.substring(0, 7) : v;
}

/** Normalize YYYY-MM or YYYY-MM-DD to YYYY-MM. */
export function normalizeMonth(value: string): string {
    return toMonthInputValue(value);
}

/** Parse snapshot_month from API without timezone drift. Returns null if invalid. */
export function normalizeSnapshotMonth(value: string | Date | unknown): string | null {
    if (value == null) return null;
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
    }
    const v = String(value).trim();
    if (/^\d{4}-\d{2}$/.test(v)) return v;
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
        return v.substring(0, 7);
    }
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
    const [y1, m1] = from.split('-').map(Number);
    const [y2, m2] = to.split('-').map(Number);
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

/** Never return a month after the current calendar month. */
export function clampMonthToCurrent(month: string, current: string = currentMonth()): string {
    const m = normalizeMonth(month);
    const cur = normalizeMonth(current);
    return compareMonths(m, cur) > 0 ? cur : m;
}

export function isFutureMonth(month: string, current: string = currentMonth()): boolean {
    return compareMonths(normalizeMonth(month), normalizeMonth(current)) > 0;
}

/** Only fill holes between consecutive snapshots when they are at most this many months apart. */
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

    if (missingMonths.length > 0) {
        return clampMonthToCurrent(missingMonths[0]!, cur);
    }

    const existing = new Set(
        snapshotMonths
            .map((m) => normalizeSnapshotMonth(m))
            .filter((m): m is string => m != null && isPlausibleMonth(m))
    );
    if (!existing.has(cur)) return cur;

    return cur;
}
