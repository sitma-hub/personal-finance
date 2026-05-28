import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    Stepper,
    Step,
    StepLabel,
    Alert,
    Chip,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Grid,
    Snackbar,
    useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    ArrowBack as BackIcon,
    ArrowForward as NextIcon,
    Check as CheckIcon,
    EventNote as EventNoteIcon,
} from '@mui/icons-material';
import { useFinancial } from '../../contexts/FinancialContext';
import { CheckInProposal, CheckInProposalLineItem, CheckInStatus } from '../../types';
import { formatChartMonthLabel, normalizeMonth, clampMonthToCurrent, compareMonths } from '../../utils/dateInput';
import { formatCurrency } from '../../utils/currency';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { useTranslation } from 'react-i18next';

const STEPS_KEYS = ['pages.checkIn.steps.selectMonth', 'pages.checkIn.steps.reviewValues', 'pages.checkIn.steps.confirm'] as const;

const formatDelta = (delta: number): string => {
    const prefix = delta >= 0 ? '+' : '';
    return `${prefix}${formatCurrency(delta)}`;
};

interface EditableLineItem extends CheckInProposalLineItem {
    userAmount: number;
}

const MonthlyCheckIn: React.FC = () => {
    const theme = useTheme();
    const smDown = useMediaQuery(theme.breakpoints.down('sm'));
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { getCheckInStatus, getCheckInProposal, applyCheckIn, state } = useFinancial();

    const [activeStep, setActiveStep] = useState(0);
    const [status, setStatus] = useState<CheckInStatus | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [proposal, setProposal] = useState<CheckInProposal | null>(null);
    const [editedAssets, setEditedAssets] = useState<EditableLineItem[]>([]);
    const [editedLiabilities, setEditedLiabilities] = useState<EditableLineItem[]>([]);
    const [notes, setNotes] = useState('');
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [loadingProposal, setLoadingProposal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadStatus = useCallback(async () => {
        setLoadingStatus(true);
        setError(null);
        try {
            const data = await getCheckInStatus();
            setStatus(data);
            const queryMonth = searchParams.get('month');
            const initialMonth = clampMonthToCurrent(
                queryMonth && /^\d{4}-\d{2}$/.test(queryMonth)
                    ? normalizeMonth(queryMonth)
                    : data.recommendedMonth,
                data.currentMonth
            );
            setSelectedMonth(initialMonth);
        } catch {
            setError('Failed to load check-in status');
        } finally {
            setLoadingStatus(false);
        }
    }, [getCheckInStatus, searchParams]);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    const loadProposal = useCallback(async (month: string) => {
        setLoadingProposal(true);
        setError(null);
        try {
            const data = await getCheckInProposal(month);
            setProposal(data);
            setEditedAssets(data.assets.map((a) => ({ ...a, userAmount: a.proposedAmount })));
            setEditedLiabilities(data.liabilities.map((l) => ({ ...l, userAmount: l.proposedAmount })));
        } catch {
            setError('Failed to load proposal');
            setProposal(null);
        } finally {
            setLoadingProposal(false);
        }
    }, [getCheckInProposal]);

    const totals = useMemo(() => {
        const assets = editedAssets.reduce((s, a) => s + (a.userAmount || 0), 0);
        const liabilities = editedLiabilities.reduce((s, l) => s + (l.userAmount || 0), 0);
        return {
            assets: Math.round(assets * 100) / 100,
            liabilities: Math.round(liabilities * 100) / 100,
            netWorth: Math.round((assets - liabilities) * 100) / 100,
        };
    }, [editedAssets, editedLiabilities]);

    const canProceedFromMonth = !!selectedMonth && (
        !status || compareMonths(selectedMonth, status.currentMonth) <= 0
    );
    const canProceedFromReview =
        editedAssets.length + editedLiabilities.length > 0 &&
        editedAssets.every((a) => !Number.isNaN(a.userAmount)) &&
        editedLiabilities.every((l) => !Number.isNaN(l.userAmount));
    const canApply = canProceedFromReview && !saving;

    const handleNextFromMonth = async () => {
        if (!selectedMonth) return;
        await loadProposal(selectedMonth);
        setActiveStep(1);
    };

    const handleNextFromReview = () => {
        setActiveStep(2);
    };

    const handleBack = () => {
        setActiveStep((s) => Math.max(0, s - 1));
    };

    const handleApply = async () => {
        if (!proposal || !canApply) return;

        if (proposal.hasExistingSnapshot) {
            const label = formatChartMonthLabel(proposal.targetMonth);
            if (!window.confirm(`A snapshot for ${label} already exists. Overwrite?`)) {
                return;
            }
        }

        setSaving(true);
        setError(null);
        try {
            await applyCheckIn({
                targetMonth: proposal.targetMonth,
                assets: editedAssets.map((a) => ({
                    id: a.id,
                    amount: a.userAmount,
                    name: a.name,
                    type: a.type,
                })),
                liabilities: editedLiabilities.map((l) => ({
                    id: l.id,
                    amount: l.userAmount,
                    name: l.name,
                    type: l.type,
                })),
                notes: notes.trim() || undefined,
            });
            setSnack(`Check-in saved for ${formatChartMonthLabel(proposal.targetMonth)}`);
            setTimeout(() => navigate('/'), 1500);
        } catch {
            setError('Failed to save check-in');
        } finally {
            setSaving(false);
        }
    };

    const updateAssetAmount = (id: string, value: string) => {
        const num = parseFloat(value);
        setEditedAssets((prev) =>
            prev.map((a) => (a.id === id ? { ...a, userAmount: Number.isNaN(num) ? 0 : num } : a))
        );
    };

    const updateLiabilityAmount = (id: string, value: string) => {
        const num = parseFloat(value);
        setEditedLiabilities((prev) =>
            prev.map((l) => (l.id === id ? { ...l, userAmount: Number.isNaN(num) ? 0 : num } : l))
        );
    };

    const renderLineTable = (
        title: string,
        items: EditableLineItem[],
        onChange: (id: string, value: string) => void
    ) => (
        <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>{title}</Typography>
            {items.length === 0 ? (
                <Typography variant="body2" color="text.secondary">{t('common.none')}</Typography>
            ) : (
                <GlassSurface sx={{ p: 0 }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                <TableCell align="right">{t('pages.checkIn.review.previous')}</TableCell>
                                <TableCell align="right">{t('pages.checkIn.review.proposed')}</TableCell>
                                <TableCell align="right">{t('pages.checkIn.review.yourValue')}</TableCell>
                                <TableCell align="right">{t('pages.checkIn.review.change')}</TableCell>
                                <TableCell>{t('pages.checkIn.review.basis')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.map((item) => {
                                    const change = item.userAmount - item.previousAmount;
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell align="right">{formatCurrency(item.previousAmount)}</TableCell>
                                            <TableCell align="right">{formatCurrency(item.proposedAmount)}</TableCell>
                                            <TableCell align="right" sx={{ minWidth: 120 }}>
                                                <TextField
                                                    type="number"
                                                    size="small"
                                                    value={item.userAmount}
                                                    onChange={(e) => onChange(item.id, e.target.value)}
                                                    inputProps={{ step: 100, min: 0 }}
                                                    sx={{ maxWidth: 140 }}
                                                />
                                            </TableCell>
                                            <TableCell
                                                align="right"
                                                sx={{ color: change >= 0 ? 'success.main' : 'error.main' }}
                                            >
                                                {formatDelta(change)}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">
                                                    {item.explanation}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </GlassSurface>
            )}
        </Box>
    );

    if (loadingStatus && !status) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    const monthOptions = status
        ? (() => {
            const { missingMonths, recommendedMonth, currentMonth: cur } = status;
            const picks = new Set<string>([clampMonthToCurrent(recommendedMonth, cur)]);
            missingMonths.slice(0, 3).forEach((m) => picks.add(m));
            if (missingMonths.length > 3) {
                picks.add(missingMonths[missingMonths.length - 1]!);
            }
            return Array.from(picks)
                .filter((m) => compareMonths(m, cur) <= 0)
                .sort();
        })()
        : [];

    const isCaughtUp = status
        && status.missingMonths.length === 0
        && compareMonths(status.recommendedMonth, status.currentMonth) === 0;

    const missingCountLabel = status && status.missingMonths.length > 0
        ? `${status.missingMonths.length} month${status.missingMonths.length === 1 ? '' : 's'} missing in your snapshot history`
        : null;

    return (
        <Box sx={{ width: '100%', maxWidth: 1200 }}>
            <PageHeader
                icon={<EventNoteIcon color="primary" />}
                title={t('pages.checkIn.title')}
                subtitle={t('pages.checkIn.subtitle')}
            />

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {state.error && <Alert severity="error" sx={{ mb: 2 }}>{state.error}</Alert>}

            <Stepper activeStep={activeStep} sx={{ mb: 4 }} orientation={smDown ? 'vertical' : 'horizontal'}>
                {STEPS_KEYS.map((key) => (
                    <Step key={key}>
                        <StepLabel>{t(key)}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {activeStep === 0 && status && (
                <GlassSurface sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>{t('pages.checkIn.month.pickTitle')}</Typography>

                    {isCaughtUp && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {t('pages.checkIn.month.caughtUp', { month: formatChartMonthLabel(status.currentMonth) })}
                        </Alert>
                    )}

                    {missingCountLabel && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            {missingCountLabel}. {t('pages.checkIn.month.startEarliest')}
                        </Alert>
                    )}

                    <Box display="flex" flexWrap="wrap" gap={1} mb={3}>
                        {monthOptions.map((month) => {
                            const isRecommended = month === status.recommendedMonth;
                            return (
                                <Chip
                                    key={month}
                                    label={
                                        isRecommended
                                            ? `${formatChartMonthLabel(month)} (recommended)`
                                            : formatChartMonthLabel(month)
                                    }
                                    color={selectedMonth === month ? 'primary' : 'default'}
                                    variant={selectedMonth === month ? 'filled' : 'outlined'}
                                    onClick={() => setSelectedMonth(month)}
                                />
                            );
                        })}
                    </Box>

                    <TextField
                        label={t('pages.checkIn.month.orEnter')}
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(clampMonthToCurrent(e.target.value, status.currentMonth))}
                        inputProps={{ max: status.currentMonth }}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mb: 2 }}
                    />

                    {status.lastSnapshotMonth && (
                        <Typography variant="body2" color="text.secondary">
                            {t('pages.checkIn.month.lastSnapshot', { month: formatChartMonthLabel(status.lastSnapshotMonth) })}
                        </Typography>
                    )}
                </GlassSurface>
            )}

            {activeStep === 1 && (
                <GlassSurface sx={{ p: 3 }}>
                    {loadingProposal ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    ) : proposal ? (
                        <>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                {proposal.basis === 'snapshot' && proposal.baselineMonth
                                    ? t('pages.checkIn.review.basisSnapshot', {
                                        baselineMonth: formatChartMonthLabel(proposal.baselineMonth),
                                        offsetMonths: proposal.offsetMonths,
                                        count: proposal.offsetMonths,
                                      })
                                    : t('pages.checkIn.review.basisCurrent')}
                            </Alert>

                            {proposal.isHistorical && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    {t('pages.checkIn.review.backfillOnly')}
                                </Alert>
                            )}

                            {renderLineTable('Assets', editedAssets, updateAssetAmount)}
                            {renderLineTable('Liabilities', editedLiabilities, updateLiabilityAmount)}

                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                <Grid item xs={12} sm={4}>
                                    <StatCard label="Total assets" value={formatCurrency(totals.assets)} sx={{ height: '100%' }} />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <StatCard label="Total liabilities" value={formatCurrency(totals.liabilities)} sx={{ height: '100%' }} />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <StatCard label="Net worth" value={formatCurrency(totals.netWorth)} sx={{ height: '100%' }} />
                                </Grid>
                            </Grid>

                            <TextField
                                label={t('pages.checkIn.review.notes')}
                                fullWidth
                                multiline
                                minRows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </>
                    ) : (
                        <Alert severity="warning">{t('pages.checkIn.review.noProposal')}</Alert>
                    )}
                </GlassSurface>
            )}

            {activeStep === 2 && proposal && (
                <GlassSurface sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        {t('pages.checkIn.confirm.title', { month: formatChartMonthLabel(proposal.targetMonth) })}
                    </Typography>

                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={4}>
                            <StatCard label="Assets" value={formatCurrency(totals.assets)} sx={{ height: '100%' }} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <StatCard label="Liabilities" value={formatCurrency(totals.liabilities)} sx={{ height: '100%' }} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <StatCard label="Net worth" value={formatCurrency(totals.netWorth)} sx={{ height: '100%' }} />
                        </Grid>
                    </Grid>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {proposal.updatesCurrentState
                            ? t('pages.checkIn.confirm.updatesCurrent')
                            : t('pages.checkIn.confirm.historicalOnly')}
                    </Typography>

                    {notes && (
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            {t('pages.checkIn.confirm.notesPrefix', { notes })}
                        </Typography>
                    )}
                </GlassSurface>
            )}

            <Box display="flex" justifyContent="space-between" mt={3}>
                <Button
                    startIcon={<BackIcon />}
                    onClick={activeStep === 0 ? () => navigate('/') : handleBack}
                    disabled={saving}
                >
                    {activeStep === 0 ? t('common.cancel') : t('common.back')}
                </Button>

                <Box display="flex" gap={1}>
                    {activeStep === 0 && (
                        <Button
                            variant="contained"
                            endIcon={<NextIcon />}
                            onClick={handleNextFromMonth}
                            disabled={!canProceedFromMonth || loadingProposal}
                        >
                            {t('pages.checkIn.buttons.reviewValues')}
                        </Button>
                    )}
                    {activeStep === 1 && (
                        <Button
                            variant="contained"
                            endIcon={<NextIcon />}
                            onClick={handleNextFromReview}
                            disabled={!canProceedFromReview || loadingProposal}
                        >
                            {t('common.continue')}
                        </Button>
                    )}
                    {activeStep === 2 && (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={saving ? undefined : <CheckIcon />}
                            onClick={handleApply}
                            disabled={!canApply}
                        >
                            {saving
                                ? t('common.saving')
                                : t('pages.checkIn.confirm.save', {
                                    month: formatChartMonthLabel(proposal?.targetMonth ?? selectedMonth),
                                  })}
                        </Button>
                    )}
                </Box>
            </Box>

            <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} message={snack} />
        </Box>
    );
};

export default MonthlyCheckIn;
