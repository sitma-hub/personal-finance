import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import '../../chartjs/register';
import { ChartContainer } from './ChartContainer';

type SparklinePoint = {
    actual: number;
};

type SparklineChartProps = {
    points: SparklinePoint[];
};

export const SparklineChart: React.FC<SparklineChartProps> = ({ points }) => {
    const trendUp = points.length >= 2 && points[points.length - 1].actual >= points[0].actual;
    const stroke = trendUp ? '#2e7d32' : '#c62828';

    const chartData = useMemo(
        () => ({
            labels: points.map((_, index) => String(index)),
            datasets: [
                {
                    data: points.map((p) => p.actual),
                    borderColor: stroke,
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.3,
                },
            ],
        }),
        [points, stroke],
    );

    const options: ChartOptions<'line'> = useMemo(
        () => ({
            responsive: false,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { display: false },
                y: { display: false },
            },
        }),
        [],
    );

    return (
        <ChartContainer height={32} width="96px">
            {({ width, height }) => (
                <Line data={chartData} options={options} width={width} height={height} />
            )}
        </ChartContainer>
    );
};
