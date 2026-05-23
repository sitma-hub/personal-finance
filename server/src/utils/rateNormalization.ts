/**
 * Annual rate as decimal (e.g. 0.03 = 3%).
 * Values entered as percent in the UI (3, 2.5) are normalized when > 0.25.
 */
export function normalizeAnnualRate(rate: number | string | null | undefined): number {
  const r = parseFloat(String(rate ?? 0));
  if (!r || r <= 0) return 0;
  if (r <= 0.25) return r;
  return r / 100;
}
