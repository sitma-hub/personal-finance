import { describe, it, expect } from 'vitest';
import { formatCurrency, formatChartAxisThousands } from '../currency';

describe('formatCurrency', () => {
    it('formats whole euro amounts without decimals', () => {
        const result = formatCurrency(1000);
        expect(result).toContain('1,000');
        expect(result).toContain('€');
    });

    it('coerces invalid input to zero', () => {
        expect(formatCurrency(Number.NaN)).toContain('0');
    });

    it('respects overridden fraction digits', () => {
        const result = formatCurrency(12.5, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        expect(result).toContain('12.50');
    });
});

describe('formatChartAxisThousands', () => {
    it('renders compact thousands labels', () => {
        expect(formatChartAxisThousands(120000)).toBe('€120k');
    });
});
