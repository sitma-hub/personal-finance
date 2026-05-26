import type { ChartOptions } from 'chart.js';
import { formatChartAxisThousands } from '../../utils/currency';
import { formatChartMonthLabel } from '../../utils/dateInput';

export const chartGridColor = 'rgba(0, 0, 0, 0.12)';

export const baseCartesianOptions = (): Pick<ChartOptions, 'responsive' | 'maintainAspectRatio' | 'interaction'> => ({
    responsive: false,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index',
        intersect: false,
    },
});

export const monthCategoryScale = (labels: string[]) => ({
    type: 'category' as const,
    labels,
    ticks: {
        autoSkip: true,
        maxRotation: 0,
        minRotation: 0,
        font: { size: 11 },
        callback: (value: string | number) => {
            const label = labels[Number(value)] ?? String(value);
            return formatChartMonthLabel(label);
        },
    },
    grid: { display: false },
});

export const currencyLinearScale = () => ({
    type: 'linear' as const,
    ticks: {
        callback: (value: string | number) => formatChartAxisThousands(Number(value)),
    },
    grid: {
        color: chartGridColor,
        borderDash: [3, 3],
    },
});
