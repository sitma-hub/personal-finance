export const CURRENCY = 'EUR';
export const CURRENCY_LOCALE = 'de-DE';

export function formatCurrency(
    amount: number,
    options?: Intl.NumberFormatOptions
): string {
    return new Intl.NumberFormat(CURRENCY_LOCALE, {
        style: 'currency',
        currency: CURRENCY,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        ...options,
    }).format(Number(amount) || 0);
}

let euroSymbol: string | null = null;

function getEuroSymbol(): string {
    if (!euroSymbol) {
        const parts = new Intl.NumberFormat(CURRENCY_LOCALE, {
            style: 'currency',
            currency: CURRENCY,
        }).formatToParts(0);
        euroSymbol = parts.find((p) => p.type === 'currency')?.value?.trim() ?? '€';
    }
    return euroSymbol;
}

/** Compact axis labels, e.g. €120k */
export function formatChartAxisThousands(value: number): string {
    return `${getEuroSymbol()}${(value / 1000).toFixed(0)}k`;
}
