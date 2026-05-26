import type { Theme } from '@mui/material/styles';
import type { ChartOptions } from 'chart.js';
import { formatChartAxisThousands } from '../../utils/currency';
import { formatChartMonthLabel } from '../../utils/dateInput';

export const chartGridColor = (theme: Theme): string =>
    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';

const chartTickColor = (theme: Theme): string => theme.palette.text.secondary;

const chartAxisBorderColor = (theme: Theme): string => theme.palette.divider;

const axisTicks = (theme: Theme) => ({
    color: chartTickColor(theme),
    font: { size: 11 },
});

export const chartTooltipColors = (theme: Theme) => ({
    backgroundColor: theme.palette.background.paper,
    titleColor: theme.palette.text.primary,
    bodyColor: theme.palette.text.secondary,
    borderColor: theme.palette.divider,
});

export const chartTooltipPlugin = (theme: Theme) => ({
    ...chartTooltipColors(theme),
    borderWidth: 1,
    padding: 10,
});

export const chartLegendLabels = (theme: Theme) => ({
    color: theme.palette.text.primary,
    boxWidth: 12,
    font: { size: 12 },
});

export const baseCartesianOptions = (): Pick<
    ChartOptions,
    'responsive' | 'maintainAspectRatio' | 'interaction'
> => ({
    responsive: false,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index',
        intersect: false,
    },
});

export const monthCategoryScale = (theme: Theme, labels: string[]) => ({
    type: 'category' as const,
    labels,
    ticks: {
        ...axisTicks(theme),
        autoSkip: true,
        maxRotation: 0,
        minRotation: 0,
        callback: (value: string | number) => {
            const label = labels[Number(value)] ?? String(value);
            return formatChartMonthLabel(label);
        },
    },
    grid: { display: false },
    border: { color: chartAxisBorderColor(theme) },
});

/** X axis for bar charts with categorical names (income type, payment kind, etc.). */
export const namedCategoryScale = (theme: Theme) => ({
    type: 'category' as const,
    ticks: {
        ...axisTicks(theme),
        autoSkip: true,
        maxRotation: 0,
        minRotation: 0,
    },
    grid: { display: false },
    border: { color: chartAxisBorderColor(theme) },
});

export const currencyLinearScale = (theme: Theme) => ({
    type: 'linear' as const,
    ticks: {
        ...axisTicks(theme),
        callback: (value: string | number) => formatChartAxisThousands(Number(value)),
    },
    grid: {
        color: chartGridColor(theme),
        borderDash: [3, 3] as [number, number],
    },
    border: { color: chartAxisBorderColor(theme) },
});
