import { describe, it, expect } from 'vitest';
import { parseCsv, parseCsvWithHeader, parseNumberLoose } from '../csv';

describe('parseCsv', () => {
    it('parses simple comma-separated rows', () => {
        const rows = parseCsv('a,b,c\n1,2,3');
        expect(rows).toEqual([
            ['a', 'b', 'c'],
            ['1', '2', '3'],
        ]);
    });

    it('handles quoted fields containing commas and escaped quotes', () => {
        const rows = parseCsv('name,note\n"Doe, John","said ""hi"""');
        expect(rows).toEqual([
            ['name', 'note'],
            ['Doe, John', 'said "hi"'],
        ]);
    });

    it('handles CRLF line endings and skips blank lines', () => {
        const rows = parseCsv('a,b\r\n1,2\r\n\r\n3,4\r\n');
        expect(rows).toEqual([
            ['a', 'b'],
            ['1', '2'],
            ['3', '4'],
        ]);
    });
});

describe('parseCsvWithHeader', () => {
    it('separates header from data rows', () => {
        const { headers, rows } = parseCsvWithHeader('date,amount\n2026-01-01,10');
        expect(headers).toEqual(['date', 'amount']);
        expect(rows).toEqual([['2026-01-01', '10']]);
    });

    it('returns empty arrays for empty input', () => {
        expect(parseCsvWithHeader('')).toEqual({ headers: [], rows: [] });
    });
});

describe('parseNumberLoose', () => {
    it('parses plain numbers', () => {
        expect(parseNumberLoose('1234.56')).toBeCloseTo(1234.56);
    });

    it('parses European formatting with comma decimals', () => {
        expect(parseNumberLoose('1.234,56')).toBeCloseTo(1234.56);
    });

    it('parses US formatting with thousands separators', () => {
        expect(parseNumberLoose('1,234.56')).toBeCloseTo(1234.56);
    });

    it('handles negative values and currency symbols', () => {
        expect(parseNumberLoose('-€1.200,00')).toBeCloseTo(-1200);
    });

    it('returns NaN for non-numeric input', () => {
        expect(Number.isNaN(parseNumberLoose('abc'))).toBe(true);
    });
});
