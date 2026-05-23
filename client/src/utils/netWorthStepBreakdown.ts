import { formatChartMonthLabel, normalizeSnapshotMonth } from './dateInput';
import type {
    NetWorthSnapshot,
    NetWorthTrend,
    PayoffRedirectEvent,
    SnapshotBreakdownItem,
} from '../types';

export type NetWorthScenario = 'actual' | 'expected' | 'pessimistic' | 'optimistic';

export type ChartPointKind = 'snapshot' | 'forecast';

export interface NetWorthChartRow {
    month: string;
    kind?: ChartPointKind;
    actual: number | null;
    expected: number | null;
    pessimistic: number | null;
    optimistic: number | null;
    assetsExpected?: number;
    assetsPessimistic?: number;
    assetsOptimistic?: number;
    liabilities?: number;
}

export interface ScenarioEstimate {
    scenario: NetWorthScenario;
    label: string;
    netWorth: number;
    assets: number;
    liabilities: number;
    previousNetWorth: number | null;
    previousAssets: number | null;
    previousLiabilities: number | null;
    deltaNetWorth: number | null;
    deltaAssets: number | null;
    deltaLiabilities: number | null;
}

export interface NetWorthStepBreakdown {
    month: string;
    monthLabel: string;
    kind: ChartPointKind;
    clickedScenario: NetWorthScenario;
    estimates: ScenarioEstimate[];
    previousMonth: string | null;
    previousMonthLabel: string | null;
    drivers: string[];
    assetBreakdown: SnapshotBreakdownItem[];
    liabilityBreakdown: SnapshotBreakdownItem[];
}

const FORECAST_SCENARIOS: NetWorthScenario[] = ['expected', 'pessimistic', 'optimistic'];

const SCENARIO_LABELS: Record<NetWorthScenario, string> = {
    actual: 'Recorded (snapshot)',
    expected: 'Forecast (expected)',
    pessimistic: 'Forecast (pessimistic)',
    optimistic: 'Forecast (optimistic)',
};

export const SCENARIO_SHORT_LABELS: Record<NetWorthScenario, string> = {
    actual: 'Recorded',
    expected: 'Expected',
    pessimistic: 'Pessimistic',
    optimistic: 'Optimistic',
};

export function resolveClickedScenario(
    dataKey: string | undefined,
    row: NetWorthChartRow
): NetWorthScenario {
    const key = dataKey as NetWorthScenario;
    if (key === 'actual' && row.actual != null) return 'actual';
    if (key === 'pessimistic' && row.pessimistic != null) return 'pessimistic';
    if (key === 'optimistic' && row.optimistic != null) return 'optimistic';
    if (key === 'expected' && row.expected != null) return 'expected';
    if (row.actual != null) return 'actual';
    if (row.expected != null) return 'expected';
    if (row.pessimistic != null) return 'pessimistic';
    if (row.optimistic != null) return 'optimistic';
    return 'expected';
}

function netWorthForScenario(row: NetWorthChartRow, scenario: NetWorthScenario): number | null {
    switch (scenario) {
        case 'actual':
            return row.actual;
        case 'pessimistic':
            return row.pessimistic;
        case 'optimistic':
            return row.optimistic;
        default:
            return row.expected;
    }
}

function assetsForScenario(row: NetWorthChartRow, scenario: NetWorthScenario): number | null {
    if (row.kind === 'snapshot' || row.actual != null) {
        return row.assetsExpected ?? null;
    }
    switch (scenario) {
        case 'pessimistic':
            return row.assetsPessimistic ?? row.assetsExpected ?? null;
        case 'optimistic':
            return row.assetsOptimistic ?? row.assetsExpected ?? null;
        default:
            return row.assetsExpected ?? null;
    }
}

function inferForecastDrivers(
    deltaAssets: number | null,
    deltaLiabilities: number | null,
    month: string,
    payoffEvents: PayoffRedirectEvent[],
    plannedMonthlyContributions: number
): string[] {
    const drivers: string[] = [];

    if (deltaAssets != null && Math.abs(deltaAssets) > 0.01) {
        drivers.push(
            `Assets changed by ${deltaAssets >= 0 ? '+' : ''}${formatDelta(deltaAssets)} from the prior month.`
        );
        drivers.push(
            'Asset total includes starting values, monthly contributions on investable buckets, compounded return scenarios, and any extra investing from income growth / expense inflation in the forecast model.'
        );
        if (plannedMonthlyContributions > 0) {
            drivers.push(
                `Planned contributions across investable assets: about ${formatDelta(plannedMonthlyContributions)}/month in total.`
            );
        }
    }

    if (deltaLiabilities != null && Math.abs(deltaLiabilities) > 0.01) {
        if (deltaLiabilities < 0) {
            drivers.push(
                `Liabilities fell by ${formatDelta(Math.abs(deltaLiabilities))} (principal paydown on amortizing debt).`
            );
        } else {
            drivers.push(`Liabilities rose by ${formatDelta(deltaLiabilities)}.`);
        }
    }

    payoffEvents.forEach((ev) => {
        if (month >= ev.payoffMonth.substring(0, 7)) {
            drivers.push(
                `After ${ev.liabilityName} payoff: ${formatDelta(ev.monthlyRedirect)}/month is redirected into ${ev.targetAssetName}.`
            );
        }
    });

    if (drivers.length === 0) {
        drivers.push('No change from the previous month on this series.');
    }

    return drivers;
}

function formatDelta(n: number): string {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
    }).format(n);
}

function resolveAssetsLiabilities(
    row: NetWorthChartRow,
    scenario: NetWorthScenario,
    kind: ChartPointKind,
    monthNorm: string,
    snapshots: NetWorthSnapshot[],
    netWorthHistory: NetWorthTrend[],
    netWorth: number
): { assets: number; liabilities: number } {
    const snapshot = snapshots.find(
        (s) => normalizeSnapshotMonth(s.snapshot_month) === monthNorm
    );
    const trend = netWorthHistory.find((h) => h.month === monthNorm);

    let assets = assetsForScenario(row, scenario);
    let liabilities = row.liabilities ?? null;

    if (kind === 'snapshot') {
        if (snapshot) {
            assets = Number(snapshot.total_assets);
            liabilities = Number(snapshot.total_liabilities);
        } else if (trend) {
            assets = trend.assets;
            liabilities = trend.liabilities;
        }
    }

    if (assets == null || liabilities == null) {
        assets = assets ?? netWorth + (liabilities ?? 0);
        liabilities = liabilities ?? Math.max(0, (assets ?? 0) - netWorth);
    }

    return { assets, liabilities };
}

function buildScenarioEstimate(
    row: NetWorthChartRow,
    prevRow: NetWorthChartRow | null,
    scenario: NetWorthScenario,
    kind: ChartPointKind,
    monthNorm: string,
    snapshots: NetWorthSnapshot[],
    netWorthHistory: NetWorthTrend[]
): ScenarioEstimate | null {
    const netWorth = netWorthForScenario(row, scenario);
    if (netWorth == null) return null;

    const { assets, liabilities } = resolveAssetsLiabilities(
        row,
        scenario,
        kind,
        monthNorm,
        snapshots,
        netWorthHistory,
        netWorth
    );

    let prevAssets: number | null = null;
    let prevLiabilities: number | null = null;
    const prevNetWorth = prevRow ? netWorthForScenario(prevRow, scenario) : null;

    if (prevRow) {
        const prevMonth = prevRow.month.substring(0, 7);
        prevAssets = assetsForScenario(prevRow, scenario);
        prevLiabilities = prevRow.liabilities ?? null;
        if (prevRow.kind === 'snapshot' || prevRow.actual != null) {
            const prevSnap = snapshots.find(
                (s) => normalizeSnapshotMonth(s.snapshot_month) === prevMonth
            );
            const prevTrend = netWorthHistory.find((h) => h.month === prevMonth);
            if (prevSnap) {
                prevAssets = Number(prevSnap.total_assets);
                prevLiabilities = Number(prevSnap.total_liabilities);
            } else if (prevTrend) {
                prevAssets = prevTrend.assets;
                prevLiabilities = prevTrend.liabilities;
            }
        }
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;

    return {
        scenario,
        label: SCENARIO_LABELS[scenario],
        netWorth,
        assets,
        liabilities,
        previousNetWorth: prevNetWorth,
        previousAssets: prevAssets,
        previousLiabilities: prevLiabilities,
        deltaNetWorth:
            prevNetWorth != null ? round2(netWorth - prevNetWorth) : null,
        deltaAssets:
            prevAssets != null ? round2(assets - prevAssets) : null,
        deltaLiabilities:
            prevLiabilities != null ? round2(liabilities - prevLiabilities) : null,
    };
}

function buildSnapshotDrivers(estimate: ScenarioEstimate): string[] {
    const { deltaNetWorth, deltaAssets, deltaLiabilities } = estimate;
    return [
        'Recorded from a monthly snapshot (sum of asset values minus liability balances at that time).',
        ...(deltaNetWorth != null
            ? [
                  `Net worth changed by ${deltaNetWorth >= 0 ? '+' : ''}${formatDelta(deltaNetWorth)} since the previous point on the chart.`,
              ]
            : ['This is the first recorded point on the chart.']),
        ...(deltaAssets != null && Math.abs(deltaAssets) > 0.01
            ? [`Assets moved by ${deltaAssets >= 0 ? '+' : ''}${formatDelta(deltaAssets)}.`]
            : []),
        ...(deltaLiabilities != null && Math.abs(deltaLiabilities) > 0.01
            ? [
                  `Liabilities moved by ${deltaLiabilities >= 0 ? '+' : ''}${formatDelta(deltaLiabilities)}.`,
              ]
            : []),
    ];
}

function buildForecastDrivers(
    estimates: ScenarioEstimate[],
    monthNorm: string,
    payoffEvents: PayoffRedirectEvent[],
    plannedMonthlyContributions: number
): string[] {
    const expected = estimates.find((e) => e.scenario === 'expected') ?? estimates[0];
    const drivers = inferForecastDrivers(
        expected?.deltaAssets ?? null,
        expected?.deltaLiabilities ?? null,
        monthNorm,
        payoffEvents,
        plannedMonthlyContributions
    );

    const deltaParts = estimates
        .filter((e) => e.deltaNetWorth != null)
        .map(
            (e) =>
                `${SCENARIO_SHORT_LABELS[e.scenario]}: ${e.deltaNetWorth! >= 0 ? '+' : ''}${formatDelta(e.deltaNetWorth!)}`
        );

    if (deltaParts.length > 1) {
        drivers.unshift(
            `Net worth change from prior month by scenario — ${deltaParts.join('; ')}.`
        );
    }

    const assetDeltaParts = estimates
        .filter((e) => e.deltaAssets != null && Math.abs(e.deltaAssets) > 0.01)
        .map(
            (e) =>
                `${e.scenario}: ${e.deltaAssets! >= 0 ? '+' : ''}${formatDelta(e.deltaAssets!)}`
        );

    if (assetDeltaParts.length > 1) {
        drivers.splice(1, 0, `Asset change by return scenario — ${assetDeltaParts.join('; ')}.`);
    }

    return drivers;
}

export function buildNetWorthStepBreakdown(params: {
    row: NetWorthChartRow;
    prevRow: NetWorthChartRow | null;
    clickedScenario: NetWorthScenario;
    snapshots: NetWorthSnapshot[];
    netWorthHistory: NetWorthTrend[];
    payoffEvents: PayoffRedirectEvent[];
    plannedMonthlyContributions: number;
}): NetWorthStepBreakdown | null {
    const {
        row,
        prevRow,
        clickedScenario,
        snapshots,
        netWorthHistory,
        payoffEvents,
        plannedMonthlyContributions,
    } = params;

    const kind: ChartPointKind = row.kind ?? (row.actual != null ? 'snapshot' : 'forecast');
    const monthNorm = row.month.substring(0, 7);
    const scenariosToBuild: NetWorthScenario[] =
        kind === 'forecast' ? FORECAST_SCENARIOS : ['actual'];

    const estimates = scenariosToBuild
        .map((scenario) =>
            buildScenarioEstimate(
                row,
                prevRow,
                scenario,
                kind,
                monthNorm,
                snapshots,
                netWorthHistory
            )
        )
        .filter((e): e is ScenarioEstimate => e != null);

    if (estimates.length === 0) return null;

    const snapshot = snapshots.find(
        (s) => normalizeSnapshotMonth(s.snapshot_month) === monthNorm
    );

    const drivers =
        kind === 'snapshot'
            ? buildSnapshotDrivers(estimates[0])
            : buildForecastDrivers(
                  estimates,
                  monthNorm,
                  payoffEvents,
                  plannedMonthlyContributions
              );

    return {
        month: row.month,
        monthLabel: formatChartMonthLabel(row.month),
        kind,
        clickedScenario,
        estimates,
        previousMonth: prevRow?.month ?? null,
        previousMonthLabel: prevRow ? formatChartMonthLabel(prevRow.month) : null,
        drivers,
        assetBreakdown: snapshot?.asset_breakdown ?? [],
        liabilityBreakdown: snapshot?.liability_breakdown ?? [],
    };
}
