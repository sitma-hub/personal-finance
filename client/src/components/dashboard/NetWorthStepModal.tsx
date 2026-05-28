import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Divider,
    List,
    ListItem,
    ListItemText,
    Chip,
    useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { formatCurrency } from '../../utils/currency';
import type { NetWorthStepBreakdown, ScenarioEstimate } from '../../utils/netWorthStepBreakdown';
import { SCENARIO_SHORT_LABELS } from '../../utils/netWorthStepBreakdown';
import { GlassSurface } from '../ui/GlassSurface';

type NetWorthStepModalProps = {
    open: boolean;
    breakdown: NetWorthStepBreakdown | null;
    onClose: () => void;
};

const formatSigned = (n: number | null): string => {
    if (n == null) return '—';
    const prefix = n > 0 ? '+' : '';
    return `${prefix}${formatCurrency(n)}`;
};

const highlightSx = (estimate: ScenarioEstimate, clicked: string) =>
    estimate.scenario === clicked
        ? { fontWeight: 600, bgcolor: 'action.hover' }
        : undefined;

const EstimatesTable: React.FC<{
    estimates: ScenarioEstimate[];
    clickedScenario: string;
    rows: Array<{
        label: string;
        values: (e: ScenarioEstimate) => React.ReactNode;
        strong?: boolean;
    }>;
}> = ({ estimates, clickedScenario, rows }) => (
    <TableContainer>
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell />
                    {estimates.map((e) => (
                        <TableCell
                            key={e.scenario}
                            align="right"
                            sx={highlightSx(e, clickedScenario)}
                        >
                            {SCENARIO_SHORT_LABELS[e.scenario]}
                        </TableCell>
                    ))}
                </TableRow>
            </TableHead>
            <TableBody>
                {rows.map((row) => (
                    <TableRow key={row.label}>
                        <TableCell component="th" scope="row">
                            {row.strong ? <strong>{row.label}</strong> : row.label}
                        </TableCell>
                        {estimates.map((e) => (
                            <TableCell
                                key={e.scenario}
                                align="right"
                                sx={highlightSx(e, clickedScenario)}
                            >
                                {row.strong ? (
                                    <strong>{row.values(e)}</strong>
                                ) : (
                                    row.values(e)
                                )}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </TableContainer>
);

export const NetWorthStepModal: React.FC<NetWorthStepModalProps> = ({
    open,
    breakdown,
    onClose,
}) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    if (!breakdown) return null;

    const { estimates, clickedScenario, kind } = breakdown;
    const multiScenario = estimates.length > 1;
    const hasBreakdownTables =
        breakdown.assetBreakdown.length > 0 || breakdown.liabilityBreakdown.length > 0;

    const liabilitiesShared =
        multiScenario &&
        estimates.every((e) => e.liabilities === estimates[0].liabilities);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
            <DialogTitle>Net worth step — {breakdown.monthLabel}</DialogTitle>
            <DialogContent dividers>
                <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                    <Chip
                        size="small"
                        label={kind === 'snapshot' ? 'Recorded snapshot' : 'Forecast'}
                        color={kind === 'snapshot' ? 'primary' : 'default'}
                    />
                    {multiScenario && (
                        <Chip
                            size="small"
                            label="Expected · Pessimistic · Optimistic"
                            variant="outlined"
                        />
                    )}
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                    This month
                </Typography>
                <EstimatesTable
                    estimates={estimates}
                    clickedScenario={clickedScenario}
                    rows={[
                        {
                            label: 'Assets',
                            values: (e) => formatCurrency(e.assets),
                        },
                        {
                            label: 'Liabilities',
                            values: (e) => formatCurrency(e.liabilities),
                        },
                        {
                            label: 'Net worth',
                            values: (e) => formatCurrency(e.netWorth),
                            strong: true,
                        },
                    ]}
                />
                {liabilitiesShared && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                        Liabilities are the same across scenarios ({formatCurrency(estimates[0].liabilities)}).
                        Net worth differs by asset return scenario: assets − liabilities.
                    </Typography>
                )}
                {!multiScenario && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                        Net worth = assets − liabilities ({formatCurrency(estimates[0].assets)} −{' '}
                        {formatCurrency(estimates[0].liabilities)}).
                    </Typography>
                )}

                {breakdown.previousMonthLabel && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" gutterBottom>
                            Change from {breakdown.previousMonthLabel}
                        </Typography>
                        <EstimatesTable
                            estimates={estimates}
                            clickedScenario={clickedScenario}
                            rows={[
                                {
                                    label: 'Assets',
                                    values: (e) => formatSigned(e.deltaAssets),
                                },
                                {
                                    label: 'Liabilities',
                                    values: (e) => formatSigned(e.deltaLiabilities),
                                },
                                {
                                    label: 'Net worth',
                                    values: (e) => formatSigned(e.deltaNetWorth),
                                    strong: true,
                                },
                            ]}
                        />
                        {multiScenario && (
                            <TableContainer sx={{ mt: 2 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell />
                                            {estimates.map((e) => (
                                                <TableCell
                                                    key={e.scenario}
                                                    align="right"
                                                    sx={highlightSx(e, clickedScenario)}
                                                >
                                                    Previous → this month
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell component="th" scope="row">
                                                Net worth
                                            </TableCell>
                                            {estimates.map((e) => (
                                                <TableCell
                                                    key={e.scenario}
                                                    align="right"
                                                    sx={highlightSx(e, clickedScenario)}
                                                >
                                                    {e.previousNetWorth != null
                                                        ? `${formatCurrency(e.previousNetWorth)} → ${formatCurrency(e.netWorth)}`
                                                        : '—'}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </>
                )}

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                    How this step is calculated
                </Typography>
                <List dense disablePadding>
                    {breakdown.drivers.map((text, i) => (
                        <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                            <ListItemText
                                primary={text}
                                primaryTypographyProps={{ variant: 'body2' }}
                            />
                        </ListItem>
                    ))}
                </List>

                {hasBreakdownTables && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" gutterBottom>
                            Snapshot breakdown
                        </Typography>
                        {breakdown.assetBreakdown.length > 0 && (
                            <GlassSurface sx={{ p: 0, mb: 2 }}>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Asset</TableCell>
                                                <TableCell align="right">Value</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {breakdown.assetBreakdown.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.name}</TableCell>
                                                    <TableCell align="right">
                                                        {formatCurrency(item.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </GlassSurface>
                        )}
                        {breakdown.liabilityBreakdown.length > 0 && (
                            <GlassSurface sx={{ p: 0 }}>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Liability</TableCell>
                                                <TableCell align="right">Balance</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {breakdown.liabilityBreakdown.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.name}</TableCell>
                                                    <TableCell align="right">
                                                        {formatCurrency(item.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </GlassSurface>
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};
