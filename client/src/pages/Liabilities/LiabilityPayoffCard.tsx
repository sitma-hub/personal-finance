import React, { useMemo } from 'react';
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    Box,
    FormControlLabel,
    Checkbox,
    TextField,
    Chip,
    Stack,
    Alert,
    useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { Liability } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatChartMonthLabel } from '../../utils/dateInput';
import { LiabilityPayoffChart, PayoffChartSeries } from '../../components/charts/LiabilityPayoffChart';
import {
    PayoffScenario,
    buildPayoffChartRows,
    buildPayoffSchedule,
    comparePayoffSchedules,
    BASELINE_SCENARIO_ID,
    SAVED_SCENARIO_ID,
    createBaselineScenario,
    createExtraMonthlyScenario,
    createLumpSumScenario,
    createSavedScenario,
} from '../../utils/liabilityPayoffProjection';

export const PAYOFF_CHART_COLORS = ['#0088FE', '#00C49F', '#FF8042', '#8884D8'];

export type LiabilityPayoffScenarioState = {
    showBaseline: boolean;
    showSaved: boolean;
    extraMonthlyEnabled: boolean;
    extraMonthlyAmount: number;
    lumpSumEnabled: boolean;
    lumpSumAmount: number;
};

export const defaultPayoffScenarioState = (): LiabilityPayoffScenarioState => ({
    showBaseline: true,
    showSaved: true,
    extraMonthlyEnabled: false,
    extraMonthlyAmount: 200,
    lumpSumEnabled: false,
    lumpSumAmount: 5000,
});

type LiabilityPayoffCardProps = {
    liability: Liability;
    liabilityTypeLabel: string;
    typeIcon: React.ReactElement;
    scenarioState: LiabilityPayoffScenarioState;
    onScenarioStateChange: (next: LiabilityPayoffScenarioState) => void;
    defaultExpanded?: boolean;
};

function buildActiveScenarios(state: LiabilityPayoffScenarioState): PayoffScenario[] {
    const scenarios: PayoffScenario[] = [];
    if (state.showBaseline) {
        scenarios.push(createBaselineScenario());
    }
    if (state.showSaved) {
        scenarios.push(createSavedScenario());
    }
    if (state.extraMonthlyEnabled && state.extraMonthlyAmount > 0) {
        scenarios.push(createExtraMonthlyScenario(state.extraMonthlyAmount, state.showSaved));
    }
    if (state.lumpSumEnabled && state.lumpSumAmount > 0) {
        scenarios.push(createLumpSumScenario(state.lumpSumAmount, state.showSaved));
    }
    return scenarios;
}

export const LiabilityPayoffCard: React.FC<LiabilityPayoffCardProps> = ({
    liability,
    liabilityTypeLabel,
    typeIcon,
    scenarioState,
    onScenarioStateChange,
    defaultExpanded = false,
}) => {
    const theme = useTheme();
    const smDown = useMediaQuery(theme.breakpoints.down('sm'));
    const activeScenarios = useMemo(
        () => buildActiveScenarios(scenarioState),
        [scenarioState]
    );

    const chartSeries = useMemo((): PayoffChartSeries[] => {
        return activeScenarios.map((scenario, index) => ({
            scenario,
            result: buildPayoffSchedule(liability, scenario),
            color: PAYOFF_CHART_COLORS[index % PAYOFF_CHART_COLORS.length],
        }));
    }, [liability, activeScenarios]);

    const chartRows = useMemo(
        () => buildPayoffChartRows(liability, activeScenarios),
        [liability, activeScenarios]
    );

    const baselineResult = useMemo(
        () => buildPayoffSchedule(liability, createBaselineScenario()),
        [liability]
    );

    const savedResult = useMemo(
        () => buildPayoffSchedule(liability, createSavedScenario()),
        [liability]
    );

    const startingBalance = savedResult.startingBalance;
    const isPaidOff = startingBalance <= 0;
    const rateLabel = liability.interest_rate ? `${liability.interest_rate}%` : 'N/A';

    const whatIfIncludesSpecial = scenarioState.showSaved;
    const extraMonthlyCheckboxLabel = whatIfIncludesSpecial
        ? 'Extra monthly (current plan + extra)'
        : 'Extra monthly (regular payment + extra)';
    const lumpSumCheckboxLabel = whatIfIncludesSpecial
        ? 'Lump sum today (current plan + lump sum)'
        : 'Lump sum today (regular payment + lump sum)';

    const update = (patch: Partial<LiabilityPayoffScenarioState>) => {
        onScenarioStateChange({ ...scenarioState, ...patch });
    };

    return (
        <Accordion defaultExpanded={defaultExpanded} disableGutters variant="outlined" sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" width="100%">
                    {typeIcon}
                    <Typography variant="subtitle1" fontWeight={600}>
                        {liability.name}
                    </Typography>
                    <Chip label={liabilityTypeLabel} size="small" variant="outlined" />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', mr: 1 }}>
                        {isPaidOff ? 'Paid off' : formatCurrency(startingBalance)}
                        {!isPaidOff && ` @ ${rateLabel}`}
                    </Typography>
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                {isPaidOff ? (
                    <Alert severity="success">This liability has no remaining balance.</Alert>
                ) : (
                    <>
                        {!liability.as_of_month && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                No as-of month set — chart uses the recorded balance as of today.
                            </Alert>
                        )}

                        <LiabilityPayoffChart series={chartSeries} chartRows={chartRows} />

                        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                            Scenarios
                        </Typography>
                        <Stack spacing={0.5} sx={{ mb: 2 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={scenarioState.showBaseline}
                                        onChange={(e) => update({ showBaseline: e.target.checked })}
                                    />
                                }
                                label="Baseline (regular payment only)"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={scenarioState.showSaved}
                                        onChange={(e) => update({ showSaved: e.target.checked })}
                                    />
                                }
                                label="Current plan (incl. special repayments)"
                            />
                            <Box display="flex" alignItems="center" flexWrap="wrap" gap={1}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={scenarioState.extraMonthlyEnabled}
                                            onChange={(e) => update({ extraMonthlyEnabled: e.target.checked })}
                                        />
                                    }
                                    label={extraMonthlyCheckboxLabel}
                                />
                                <TextField
                                    size="small"
                                    type="number"
                                    label="€/month"
                                    value={scenarioState.extraMonthlyAmount}
                                    onChange={(e) =>
                                        update({ extraMonthlyAmount: Math.max(0, Number(e.target.value)) })
                                    }
                                    disabled={!scenarioState.extraMonthlyEnabled}
                                    inputProps={{ min: 0, step: 50 }}
                                    sx={{ width: smDown ? '100%' : 120 }}
                                />
                            </Box>
                            <Box display="flex" alignItems="center" flexWrap="wrap" gap={1}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={scenarioState.lumpSumEnabled}
                                            onChange={(e) => update({ lumpSumEnabled: e.target.checked })}
                                        />
                                    }
                                    label={lumpSumCheckboxLabel}
                                />
                                <TextField
                                    size="small"
                                    type="number"
                                    label="€"
                                    value={scenarioState.lumpSumAmount}
                                    onChange={(e) =>
                                        update({ lumpSumAmount: Math.max(0, Number(e.target.value)) })
                                    }
                                    disabled={!scenarioState.lumpSumEnabled}
                                    inputProps={{ min: 0, step: 500 }}
                                    sx={{ width: smDown ? '100%' : 120 }}
                                />
                            </Box>
                        </Stack>

                        <Typography variant="subtitle2" gutterBottom>
                            Summary
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                            {chartSeries.map(({ scenario, result, color }) => {
                                const whatIfUsesCurrentPlan =
                                    (scenario.kind === 'extra_monthly' || scenario.kind === 'lump_sum') &&
                                    scenario.includeSavedSpecialRepayments === true;
                                const comparisonRef = whatIfUsesCurrentPlan ? savedResult : baselineResult;
                                const comparisonLabel = whatIfUsesCurrentPlan
                                    ? 'vs current plan'
                                    : 'vs baseline';
                                const referenceScenarioId = whatIfUsesCurrentPlan
                                    ? SAVED_SCENARIO_ID
                                    : BASELINE_SCENARIO_ID;
                                const vsRef = comparePayoffSchedules(comparisonRef, result);
                                const showComparison =
                                    scenario.id !== referenceScenarioId &&
                                    vsRef.monthsSaved != null &&
                                    vsRef.monthsSaved > 0;
                                const payoffLabel =
                                    result.payoffMonth != null
                                        ? formatChartMonthLabel(result.payoffMonth)
                                        : '50+ years';
                                const monthsLabel =
                                    result.monthsToPayoff != null
                                        ? `${result.monthsToPayoff} mo`
                                        : '600+ mo';

                                return (
                                    <Chip
                                        key={scenario.id}
                                        label={
                                            <Box component="span">
                                                <strong>{scenario.label}:</strong>{' '}
                                                {payoffLabel} · {monthsLabel} ·{' '}
                                                {formatCurrency(result.totalInterest)} interest
                                                {showComparison && (
                                                        <>
                                                            {' '}
                                                            (−{vsRef.monthsSaved} mo {comparisonLabel},{' '}
                                                            {formatCurrency(vsRef.interestSaved ?? 0)} interest saved)
                                                        </>
                                                    )}
                                            </Box>
                                        }
                                        sx={{
                                            borderLeft: `4px solid ${color}`,
                                            height: 'auto',
                                            py: 1,
                                            '& .MuiChip-label': { whiteSpace: 'normal' },
                                        }}
                                        variant="outlined"
                                    />
                                );
                            })}
                        </Stack>

                        {scenarioState.showBaseline &&
                            scenarioState.showSaved &&
                            savedResult.monthsToPayoff != null &&
                            baselineResult.monthsToPayoff != null &&
                            savedResult.monthsToPayoff === baselineResult.monthsToPayoff && (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                    Baseline and current plan match — no special repayments configured or they have no
                                    effect on this schedule.
                                </Typography>
                            )}
                    </>
                )}
            </AccordionDetails>
        </Accordion>
    );
};
