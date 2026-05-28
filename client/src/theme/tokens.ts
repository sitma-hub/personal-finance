import type { Theme } from '@mui/material/styles';

export const appTokens = {
    radius: 12,
    color: {
        dark: {
            page: '#0B0F19',
            surface: '#121826',
            elevated: '#1A2332',
            border: 'rgba(255,255,255,0.08)',
            textMuted: 'rgba(255,255,255,0.72)',
        },
        light: {
            page: '#F6F8FC',
            surface: '#FFFFFF',
            elevated: '#FFFFFF',
            border: 'rgba(15,23,42,0.12)',
            textMuted: 'rgba(15,23,42,0.72)',
        },
        accent: {
            teal: '#14B8A6',
            tealDark: '#0D9488',
            amber: '#F59E0B',
            rose: '#FB7185',
            blue: '#60A5FA',
        },
    },
    chart: {
        series: ['#60A5FA', '#14B8A6', '#A78BFA', '#F59E0B', '#FB7185', '#34D399'],
    },
} as const;

export function getChartSeriesColors(theme: Theme): string[] {
    // Keep series colors stable across light/dark; readability is handled by chartTheme grid/tick colors.
    void theme;
    return [...appTokens.chart.series];
}

