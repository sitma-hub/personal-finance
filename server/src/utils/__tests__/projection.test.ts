import { projectAssetMonths, addSeries, valueAtMonth } from '../projection';

describe('projectAssetMonths', () => {
  it('compounds balance and adds the monthly contribution', () => {
    const series = projectAssetMonths(1000, 100, 0.12, 1);
    // 1000 * (1 + 0.12/12) + 100 = 1010 + 100 = 1110
    expect(series).toEqual([1110]);
  });

  it('produces one entry per month', () => {
    const series = projectAssetMonths(0, 50, 0.06, 12);
    expect(series).toHaveLength(12);
    // With contributions and positive return the balance should grow each month
    for (let i = 1; i < series.length; i++) {
      expect(series[i]!).toBeGreaterThan(series[i - 1]!);
    }
  });

  it('handles a zero return rate as simple accumulation', () => {
    const series = projectAssetMonths(0, 100, 0, 3);
    expect(series).toEqual([100, 200, 300]);
  });
});

describe('addSeries', () => {
  it('adds element-wise', () => {
    expect(addSeries([1, 2, 3], [10, 20, 30])).toEqual([11, 22, 33]);
  });

  it('extends shorter series using its last value', () => {
    expect(addSeries([1, 2], [10, 20, 30])).toEqual([11, 22, 32]);
  });
});

describe('valueAtMonth', () => {
  it('clamps the index into range', () => {
    const series = [5, 10, 15];
    expect(valueAtMonth(series, -1)).toBe(5);
    expect(valueAtMonth(series, 1)).toBe(10);
    expect(valueAtMonth(series, 99)).toBe(15);
  });

  it('returns 0 for an empty series', () => {
    expect(valueAtMonth([], 3)).toBe(0);
  });
});
