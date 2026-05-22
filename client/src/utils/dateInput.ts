/** Normalize API date strings for `<input type="date">` (yyyy-MM-dd). */
export function toDateInputValue(value?: string | null): string {
    if (!value) return '';
    const v = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    if (v.includes('T')) return v.substring(0, 10);
    if (/^\d{4}-\d{2}$/.test(v)) return `${v}-01`;
    return v.substring(0, 10);
}

/** Format YYYY-MM (or ISO date) for chart tooltips, e.g. "May 2026". */
export function formatChartMonthLabel(month?: string | null): string {
    if (!month) return '';
    const v = month.trim();
    if (/^\d{4}-\d{2}$/.test(v)) {
        const [y, m] = v.split('-').map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
        const d = new Date(`${v.substring(0, 10)}T12:00:00`);
        if (!Number.isNaN(d.getTime())) {
            return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
    }
    return v;
}

/** Normalize API date strings for `<input type="month">` (yyyy-MM). */
export function toMonthInputValue(value?: string | null): string {
    if (!value) return '';
    const v = value.trim();
    if (/^\d{4}-\d{2}$/.test(v)) return v;
    if (v.includes('T')) return v.substring(0, 7);
    return v.length >= 7 ? v.substring(0, 7) : v;
}
