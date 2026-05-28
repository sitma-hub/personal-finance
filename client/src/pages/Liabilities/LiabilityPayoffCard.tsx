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
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();

    const localizeScenarioLabel = (scenario: PayoffScenario): string => {
        switch (scenario.kind) {
            case 'baseline':
                return t('pages.liabilities.payoffCard.scenarioBaseline');
            case 'saved':
                return t('pages.liabilities.payoffCard.scenarioCurrentPlan');
            case 'extra_monthly':
                return scenario.includeSavedSpecialRepayments
                    ? t('pages.liabilities.payoffCard.extraMonthlyCurrentPlan')
                    : t('pages.liabilities.payoffCard.extraMonthlyBaseline');
            case 'lump_sum':
                return scenario.includeSavedSpecialRepayments
                    ? t('pages.liabilities.payoffCard.lumpSumCurrentPlan')
                    : t('pages.liabilities.payoffCard.lumpSumBaseline');
            default:
                return scenario.label;
        }
    };
    const activeScenarios = useMemo(
        () => buildActiveScenarios(scenarioState),
        [scenarioState]
    );

    const chartSeries = useMemo((): PayoffChartSeries[] => {
        return activeScenarios.map((scenario, index) => ({
            scenario: { ...scenario, label: localizeScenarioLabel(scenario) },
            result: buildPayoffSchedule(liability, scenario),
            color: PAYOFF_CHART_COLORS[index % PAYOFF_CHART_COLORS.length],
        }));
    }, [liability, activeScenarios, t]);

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
    const rateLabel = liability.interest_rate ? `${liability.interest_rate}%` : t('pages.liabilities.payoffCard.rateNa');

    const whatIfIncludesSpecial = scenarioState.showSaved;
    const extraMonthlyCheckboxLabel = whatIfIncludesSpecial
        ? t('pages.liabilities.payoffCard.extraMonthlyCurrentPlan')
        : t('pages.liabilities.payoffCard.extraMonthlyBaseline');
    const lumpSumCheckboxLabel = whatIfIncludesSpecial
        ? t('pages.liabilities.payoffCard.lumpSumCurrentPlan')
        : t('pages.liabilities.payoffCard.lumpSumBaseline');

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
                        {isPaidOff ? t('pages.liabilities.payoffCard.paidOff') : formatCurrency(startingBalance)}
                        {!isPaidOff && ` @ ${rateLabel}`}
                    </Typography>
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                {isPaidOff ? (
                    <Alert severity="success">{t('pages.liabilities.payoffCard.noRemainingBalance')}</Alert>
                ) : (
                    <>
                        {!liability.as_of_month && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                {t('pages.liabilities.payoffCard.noAsOfMonth')}
                            </Alert>
                        )}

                        <LiabilityPayoffChart series={chartSeries} chartRows={chartRows} />

                        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                            {t('pages.liabilities.payoffCard.scenarios')}
                        </Typography>
                        <Stack spacing={0.5} sx={{ mb: 2 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={scenarioState.showBaseline}
                                        onChange={(e) => update({ showBaseline: e.target.checked })}
                                    />
                                }
                                label={t('pages.liabilities.payoffCard.scenarioBaseline')}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={scenarioState.showSaved}
                                        onChange={(e) => update({ showSaved: e.target.checked })}
                                    />
                                }
                                label={t('pages.liabilities.payoffCard.scenarioCurrentPlan')}
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
                                    label={t('pages.liabilities.payoffCard.perMonth')}
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
                                    label={t('pages.liabilities.payoffCard.amountEuro')}
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
                            {t('pages.liabilities.payoffCard.summary')}
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                            {chartSeries.map(({ scenario, result, color }) => {
                                const whatIfUsesCurrentPlan =
                                    (scenario.kind === 'extra_monthly' || scenario.kind === 'lump_sum') &&
                                    scenario.includeSavedSpecialRepayments === true;
                                const comparisonRef = whatIfUsesCurrentPlan ? savedResult : baselineResult;
                                const comparisonLabel = whatIfUsesCurrentPlan
                                    ? t('pages.liabilities.payoffCard.vsCurrentPlan')
                                    : t('pages.liabilities.payoffCard.vsBaseline');
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
                                        : t('pages.liabilities.payoffCard.fallbackYears');
                                const monthsLabel =
                                    result.monthsToPayoff != null
                                        ? `${result.monthsToPayoff} mo`
                                        : t('pages.liabilities.payoffCard.fallbackMonths');

                                return (
                                    <Chip
                                        key={scenario.id}
                                        label={
                                            <Box component="span">
                                                <strong>{scenario.label}:</strong>{' '}
                                                {payoffLabel} · {monthsLabel} ·{' '}
                                                {formatCurrency(result.totalInterest)} {t('pages.liabilities.payoffCard.interest')}
                                                {showComparison && (
                                                        <>
                                                            {' '}
                                                            (−{vsRef.monthsSaved} mo {comparisonLabel},{' '}
                                                            {formatCurrency(vsRef.interestSaved ?? 0)} {t('pages.liabilities.payoffCard.interestSaved')})
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
                                    {t('pages.liabilities.payoffCard.baselineMatches')}
                                </Typography>
                            )}
                    </>
                )}
            </AccordionDetails>
        </Accordion>
    );
};
