/** Annual rate as decimal. Accepts legacy percent values (e.g. 3 for 3%). */
export function normalizeAnnualRate(rate: number | string | null | undefined): number {
    const r = parseFloat(String(rate ?? 0));
    if (!r || r <= 0) return 0;
    if (r <= 0.25) return r;
    return r / 100;
}

/** Display in a percent input (3 for 3%). */
export function annualRateToPercentInput(rate: number | undefined | null): number {
    const n = Number(rate ?? 0);
    if (!n) return 0;
    return n <= 0.25 ? n * 100 : n;
}

/** Format for read-only tables. */
export function formatAnnualRatePercent(rate: number | undefined | null): string {
    const n = Number(rate ?? 0);
    if (!n) return '0';
    const pct = n <= 0.25 ? n * 100 : n;
    return pct % 1 === 0 ? String(pct) : pct.toFixed(2);
}
