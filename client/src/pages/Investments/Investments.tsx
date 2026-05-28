import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Button,
    Alert,
    CircularProgress,
    ToggleButton,
    ToggleButtonGroup,
    Chip,
    FormControlLabel,
    Switch,
    TextField,
    useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add as AddIcon, ShowChart as ShowChartIcon } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Link } from '@mui/material';
import { useFinancial } from '../../contexts/FinancialContext';
import { projectionService } from '../../services/projectionService';
import { AssetProjectionSummary, InvestableHistoryPoint, InvestmentProjectionsResponse } from '../../types';
import { ForecastRangeChart } from '../../components/charts/ForecastRangeChart';
import { SparklineChart } from '../../components/charts/SparklineChart';
import { formatCurrency } from '../../utils/currency';
import { formatChartMonthLabel } from '../../utils/dateInput';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { ResponsiveDataView, type ResponsiveColumn } from '../../components/ui/ResponsiveDataView';
import { useTranslation } from 'react-i18next';

const MIN_FORECAST_YEARS = 1;
const MAX_FORECAST_YEARS = 40;

type ForecastPreset = '5' | '10' | '20' | 'custom';

const clampForecastYears = (years: number): number =>
    Math.min(MAX_FORECAST_YEARS, Math.max(MIN_FORECAST_YEARS, years));

const formatPct = (rate: number) => `${(rate * 100).toFixed(1)}%`;

const projectionAtHorizon = (
    asset: AssetProjectionSummary,
    includePayoff: boolean,
) => {
    const series = includePayoff && asset.payoffSeries?.length ? asset.payoffSeries : asset.series;
    const fallback = {
        pessimistic: asset.currentValue,
        expected: asset.currentValue,
        optimistic: asset.currentValue,
    };
    if (!series.length) return fallback;
    return series[series.length - 1] ?? fallback;
};

type InvestmentChartRow = {
    month: string;
    actual: number | null;
    expected: number | null;
    pessimistic: number | null;
    optimistic: number | null;
};

const INVESTMENT_SERIES_LABELS: Record<string, string> = {
    actual: 'Recorded value',
    expected: 'Forecast (expected)',
    pessimistic: 'Forecast (pessimistic)',
    optimistic: 'Forecast (optimistic)',
};

const BucketSparkline: React.FC<{ points: InvestableHistoryPoint[] }> = ({ points }) => {
    if (points.length < 2) {
        return (
            <Typography variant="caption" color="text.secondary">
                —
            </Typography>
        );
    }

    return <SparklineChart points={points} />;
};

const Investments: React.FC = () => {
    const theme = useTheme();
    const smDown = useMediaQuery(theme.breakpoints.down('sm'));
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { state } = useFinancial();
    const { summary } = state;
    const [forecastPreset, setForecastPreset] = useState<ForecastPreset>('10');
    const [customYearsInput, setCustomYearsInput] = useState('15');
    const [includePayoffInForecast, setIncludePayoffInForecast] = useState(false);
    const [data, setData] = useState<InvestmentProjectionsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const forecastYears = useMemo(() => {
        if (forecastPreset === 'custom') {
            const parsed = parseInt(customYearsInput, 10);
            return clampForecastYears(Number.isFinite(parsed) ? parsed : 15);
        }
        return Number(forecastPreset);
    }, [forecastPreset, customYearsInput]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        projectionService
            .getInvestmentProjections(forecastYears)
            .then((res) => {
                if (!cancelled) setData(res.data);
            })
            .catch(() => {
                if (!cancelled) setError('Failed to load projections');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [forecastYears]);

    const surplus = summary?.monthlySavings ?? 0;
    const plannedDca = data?.totalMonthlyContribution ?? 0;
    const afterDca = surplus - plannedDca;

    const payoffEvents = data?.payoffEvents ?? [];
    const hasPayoffForecast =
        payoffEvents.length > 0 && (data?.payoffInvestingTotalsSeries?.length ?? 0) > 0;
    const showPayoffForecast = includePayoffInForecast && hasPayoffForecast;
    const chartHeight = smDown ? 300 : 400;

    const chartData = useMemo((): InvestmentChartRow[] => {
        const historical: InvestmentChartRow[] = (data?.historySeries || []).map((point) => ({
            month: point.month,
            actual: point.actual,
            expected: null,
            pessimistic: null,
            optimistic: null,
        }));

        const forecastSource = showPayoffForecast
            ? data!.payoffInvestingTotalsSeries!
            : (data?.totalsSeries || []);

        const forecast: InvestmentChartRow[] = forecastSource.map((point) => ({
            month: point.month,
            actual: null,
            expected: point.expected,
            pessimistic: point.pessimistic,
            optimistic: point.optimistic,
        }));

        return [...historical, ...forecast].sort((a, b) => a.month.localeCompare(b.month));
    }, [data, showPayoffForecast]);

    const hasHistory = chartData.some((row) => row.actual != null);
    const hasForecast = chartData.some((row) => row.expected != null);
    const hasChart = hasHistory || hasForecast;

    if (loading && !data) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', maxWidth: '100%' }}>
            <PageHeader
                icon={<ShowChartIcon color="primary" />}
                title={t('pages.investments.title')}
                actions={
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/assets')}>
                        {t('actions.addInvestmentBucket')}
                    </Button>
                }
            />

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Alert severity="info" sx={{ mb: 3 }}>
                {t('pages.investments.help.intro')}{' '}
                <Link component={RouterLink} to="/assets">{t('pages.assets.title')}</Link>{' '}
                {t('pages.investments.help.introSuffix')}
            </Alert>

            {data && (
                <>
                    <Grid container spacing={3} mb={3}>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                label={t('pages.investments.kpi.investableNow')}
                                value={formatCurrency(data.totalCurrentValue)}
                                sx={{ height: '100%' }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                label={t('pages.investments.kpi.plannedDca')}
                                value={formatCurrency(plannedDca)}
                                sx={{ height: '100%' }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                label={t('pages.investments.kpi.surplus')}
                                value={formatCurrency(surplus)}
                                sx={{ height: '100%' }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                label={t('pages.investments.kpi.afterDca')}
                                value={formatCurrency(afterDca)}
                                footer={afterDca < 0 ? t('pages.investments.kpi.afterDcaWarning') : undefined}
                                sx={{ height: '100%' }}
                            />
                        </Grid>
                    </Grid>

                    <GlassSurface sx={{ p: 2, mb: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                            <Typography variant="h6">{t('pages.investments.chart.title')}</Typography>
                            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                                {hasPayoffForecast && (
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                size="small"
                                                checked={includePayoffInForecast}
                                                onChange={(_, checked) => setIncludePayoffInForecast(checked)}
                                            />
                                        }
                                        label={t('pages.investments.chart.includePayoff')}
                                        sx={{ mr: 0 }}
                                    />
                                )}
                                <ToggleButtonGroup
                                    size="small"
                                    exclusive
                                    value={forecastPreset}
                                    onChange={(_, value: ForecastPreset | null) => {
                                        if (value) setForecastPreset(value);
                                    }}
                                    aria-label={t('pages.investments.chart.forecastHorizon')}
                                    sx={{
                                        width: { xs: '100%', sm: 'auto' },
                                        '& .MuiToggleButton-root': { flex: { xs: 1, sm: 'initial' } },
                                    }}
                                >
                                    <ToggleButton value="5">5y</ToggleButton>
                                    <ToggleButton value="10">10y</ToggleButton>
                                    <ToggleButton value="20">20y</ToggleButton>
                                    <ToggleButton value="custom">Custom</ToggleButton>
                                </ToggleButtonGroup>
                                {forecastPreset === 'custom' && (
                                    <TextField
                                        size="small"
                                        type="number"
                                        label={t('pages.investments.chart.years')}
                                        value={customYearsInput}
                                        onChange={(e) => setCustomYearsInput(e.target.value)}
                                        onBlur={() => {
                                            setCustomYearsInput(String(forecastYears));
                                        }}
                                        inputProps={{
                                            min: MIN_FORECAST_YEARS,
                                            max: MAX_FORECAST_YEARS,
                                            step: 1,
                                        }}
                                        sx={{ width: { xs: '100%', sm: 88 } }}
                                    />
                                )}
                                {loading && data && <CircularProgress size={20} />}
                            </Box>
                        </Box>
                        {!hasChart ? (
                            <Alert severity="warning">
                                {t('pages.investments.chart.noBuckets.prefix')}{' '}
                                <Link component={RouterLink} to="/assets">{t('pages.assets.title')}</Link>{' '}
                                {t('pages.investments.chart.noBuckets.middle')}{' '}
                                <Link component={RouterLink} to="/check-in">{t('actions.monthlyCheckIn')}</Link>{' '}
                                {t('pages.investments.chart.noBuckets.suffix')}
                            </Alert>
                        ) : (
                            <Box sx={{ width: '100%', height: chartHeight }}>
                                <ForecastRangeChart
                                    data={chartData}
                                    height="100%"
                                    hasHistory={hasHistory}
                                    hasForecast={hasForecast}
                                    seriesLabels={INVESTMENT_SERIES_LABELS}
                                />
                            </Box>
                        )}
                        {!hasHistory && hasForecast && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                {t('pages.investments.chart.noHistory.prefix')}{' '}
                                <Link component={RouterLink} to="/assets">{t('pages.assets.title')}</Link>{' '}
                                {t('pages.investments.chart.noHistory.middle')}{' '}
                                <Link component={RouterLink} to="/check-in">{t('actions.monthlyCheckIn')}</Link>{' '}
                                {t('pages.investments.chart.noHistory.suffix')}
                            </Alert>
                        )}
                        <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                            {t('pages.investments.chart.captionPrefix')}
                            {showPayoffForecast ? t('pages.investments.chart.captionPayoffSuffix') : ''}
                            {t('pages.investments.chart.captionSuffix')}
                        </Typography>
                        {showPayoffForecast && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                {payoffEvents.map((ev) => (
                                    <Typography key={ev.liabilityId} variant="body2">
                                        {ev.liabilityName} paid off by {formatChartMonthLabel(ev.payoffMonth)} →
                                        invest {formatCurrency(ev.monthlyRedirect)}/mo into {ev.targetAssetName}
                                    </Typography>
                                ))}
                            </Alert>
                        )}
                    </GlassSurface>

                    <GlassSurface sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>{t('pages.investments.table.title')}</Typography>
                        {data.assets.length === 0 ? (
                            <Typography color="textSecondary">{t('pages.investments.table.empty')}</Typography>
                        ) : (
                            <ResponsiveDataView
                                rows={data.assets}
                                getRowId={(a) => a.id}
                                mobilePrimary={(a) => a.name}
                                columns={
                                    [
                                        { id: 'name', label: 'Name', render: (a) => a.name },
                                        {
                                            id: 'type',
                                            label: 'Type',
                                            render: (a) => (
                                                <Chip size="small" label={a.type.replace(/_/g, ' ')} variant="outlined" />
                                            ),
                                        },
                                        {
                                            id: 'value',
                                            label: 'Value',
                                            align: 'right',
                                            render: (a) => formatCurrency(a.currentValue),
                                        },
                                        {
                                            id: 'history',
                                            label: 'History',
                                            render: (a) => <BucketSparkline points={data.assetHistories?.[a.id] ?? []} />,
                                            hideOnMobile: true,
                                        },
                                        {
                                            id: 'dca',
                                            label: '€/mo',
                                            align: 'right',
                                            render: (a) => formatCurrency(a.monthlyContribution),
                                        },
                                        {
                                            id: 'return',
                                            label: 'Expected return',
                                            align: 'right',
                                            render: (a) => formatPct(a.expectedAnnualReturn),
                                            hideOnMobile: true,
                                        },
                                        {
                                            id: 'range',
                                            label: `${data.years}y range`,
                                            align: 'right',
                                            render: (a) => {
                                                const projected = projectionAtHorizon(a, showPayoffForecast);
                                                return (
                                                    <>
                                                        {formatCurrency(projected.pessimistic)}
                                                        {' – '}
                                                        {formatCurrency(projected.optimistic)}
                                                    </>
                                                );
                                            },
                                        },
                                    ] as ResponsiveColumn<AssetProjectionSummary>[]
                                }
                            />
                        )}
                    </GlassSurface>
                </>
            )}
        </Box>
    );
};

export default Investments;
