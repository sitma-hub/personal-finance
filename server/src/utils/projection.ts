/** Monthly balance series: balance[m] = balance[m-1] * (1 + rate/12) + contribution */
export function projectAssetMonths(
  startValue: number,
  monthlyContribution: number,
  annualRate: number,
  months: number
): number[] {
  const series: number[] = [];
  let balance = startValue;
  const monthlyRate = annualRate / 12;

  for (let m = 0; m < months; m++) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    series.push(Math.round(balance * 100) / 100);
  }

  return series;
}

export function addSeries(a: number[], b: number[]): number[] {
  const len = Math.max(a.length, b.length);
  const result: number[] = [];
  for (let i = 0; i < len; i++) {
    result.push((a[i] ?? a[a.length - 1] ?? 0) + (b[i] ?? b[b.length - 1] ?? 0));
  }
  return result;
}

export function monthLabelFromNow(offsetMonths: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function valueAtMonth(series: number[], monthIndex: number): number {
  if (series.length === 0) return 0;
  const idx = Math.min(Math.max(monthIndex, 0), series.length - 1);
  return series[idx] ?? 0;
}
