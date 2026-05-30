/**
 * Minimal RFC-4180-ish CSV parser. Handles quoted fields, escaped quotes
 * (""), and both LF and CRLF line endings. Good enough for typical bank
 * exports without pulling in a dependency.
 */
export function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    const pushField = () => {
        row.push(field);
        field = '';
    };
    const pushRow = () => {
        pushField();
        rows.push(row);
        row = [];
    };

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
        } else if (char === ',') {
            pushField();
        } else if (char === '\n') {
            pushRow();
        } else if (char === '\r') {
            // handled by following \n; ignore lone CR
        } else {
            field += char;
        }
    }

    // Flush trailing field/row if file doesn't end with newline
    if (field.length > 0 || row.length > 0) {
        pushRow();
    }

    return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export interface ParsedCsv {
    headers: string[];
    rows: string[][];
}

export function parseCsvWithHeader(text: string): ParsedCsv {
    const all = parseCsv(text);
    if (all.length === 0) return { headers: [], rows: [] };
    const [headers, ...rows] = all;
    return { headers: headers ?? [], rows };
}

/**
 * Parse a localized number string (handles thousands separators and both
 * comma and dot decimal separators). Returns NaN if unparseable.
 */
export function parseNumberLoose(value: string): number {
    if (!value) return NaN;
    let cleaned = value.replace(/[^0-9.,-]/g, '').trim();
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
        // Comma is decimal separator: remove dots (thousands), swap comma to dot
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
        // Dot decimal (or none): remove commas (thousands)
        cleaned = cleaned.replace(/,/g, '');
    }
    return parseFloat(cleaned);
}
