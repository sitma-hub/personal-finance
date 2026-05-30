import React, { useMemo, useState } from 'react';
import {
    Box,
    Collapse,
    Divider,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    useMediaQuery,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import { GlassSurface } from './GlassSurface';

export type ResponsiveColumn<Row> = {
    id: string;
    label: React.ReactNode;
    render: (row: Row) => React.ReactNode;
    align?: 'left' | 'right' | 'center';
    hideOnMobile?: boolean;
    width?: number | string;
};

export type ResponsiveDataViewProps<Row> = {
    rows: Row[];
    getRowId: (row: Row) => string;
    columns: ResponsiveColumn<Row>[];
    mobilePrimary?: (row: Row) => React.ReactNode;
    actions?: (row: Row) => React.ReactNode;
    emptyState?: React.ReactNode;
    renderExpanded?: (row: Row) => React.ReactNode;
    initialExpandedId?: string | null;
    isRowExpanded?: (row: Row) => boolean;
    onToggleRowExpanded?: (row: Row) => void;
};

function MobileField({
    label,
    value,
}: {
    label: React.ReactNode;
    value: React.ReactNode;
}) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="caption" color="text.secondary" component="span">
                {label}
            </Typography>
            <Typography variant="body2" component="span" sx={{ textAlign: 'right' }}>
                {value}
            </Typography>
        </Box>
    );
}

export function ResponsiveDataView<Row>({
    rows,
    getRowId,
    columns,
    mobilePrimary,
    actions,
    emptyState,
    renderExpanded,
    initialExpandedId = null,
    isRowExpanded,
    onToggleRowExpanded,
}: ResponsiveDataViewProps<Row>) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [expandedId, setExpandedId] = useState<string | null>(initialExpandedId);
    const isExpanded = (row: Row, id: string): boolean => {
        if (isRowExpanded) return isRowExpanded(row);
        return expandedId === id;
    };
    const toggleExpanded = (row: Row, id: string) => {
        if (onToggleRowExpanded) {
            onToggleRowExpanded(row);
            return;
        }
        setExpandedId(isExpanded(row, id) ? null : id);
    };

    const desktopColumns = useMemo(() => columns, [columns]);
    const mobileColumns = useMemo(() => columns.filter((c) => !c.hideOnMobile), [columns]);

    if (!rows.length) {
        return (
            <GlassSurface sx={{ p: 2 }}>
                {emptyState ?? (
                    <Typography variant="body2" color="text.secondary">
                        Nothing to show yet.
                    </Typography>
                )}
            </GlassSurface>
        );
    }

    if (isMobile) {
        return (
            <Stack spacing={1.5}>
                {rows.map((row) => {
                    const id = getRowId(row);
                    const expanded = isExpanded(row, id);
                    const primary = mobilePrimary ? mobilePrimary(row) : mobileColumns[0]?.render(row);

                    return (
                        <GlassSurface key={id} sx={{ p: 2 }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'space-between',
                                    gap: 1,
                                }}
                            >
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }}>
                                        {primary}
                                    </Typography>
                                </Box>
                                {renderExpanded ? (
                                    <IconButton
                                        size="small"
                                        onClick={() => toggleExpanded(row, id)}
                                        aria-label={expanded ? 'Collapse row' : 'Expand row'}
                                    >
                                        {expanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
                                    </IconButton>
                                ) : null}
                            </Box>

                            <Divider sx={{ my: 1.25 }} />

                            <Stack spacing={0.75}>
                                {mobileColumns.map((col) => (
                                    <MobileField key={col.id} label={col.label} value={col.render(row)} />
                                ))}
                            </Stack>

                            {actions ? (
                                <Box sx={{ mt: 1.25, display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                    {actions(row)}
                                </Box>
                            ) : null}

                            {renderExpanded ? (
                                <Collapse in={expanded} timeout="auto" unmountOnExit>
                                    <Box sx={{ pt: 1.25 }}>{renderExpanded(row)}</Box>
                                </Collapse>
                            ) : null}
                        </GlassSurface>
                    );
                })}
            </Stack>
        );
    }

    return (
        <GlassSurface sx={{ p: 0 }}>
            <TableContainer
                sx={{
                    '& .MuiTableCell-head': {
                        backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.55 : 0.8),
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                    },
                }}
            >
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            {renderExpanded ? <TableCell width={40} /> : null}
                            {desktopColumns.map((col) => (
                                <TableCell key={col.id} align={col.align} sx={{ width: col.width }}>
                                    {col.label}
                                </TableCell>
                            ))}
                            {actions ? <TableCell align="right" width={120} /> : null}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => {
                            const id = getRowId(row);
                            const expanded = isExpanded(row, id);

                            return (
                                <React.Fragment key={id}>
                                    <TableRow hover>
                                        {renderExpanded ? (
                                            <TableCell>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => toggleExpanded(row, id)}
                                                    aria-label={expanded ? 'Collapse row' : 'Expand row'}
                                                >
                                                    {expanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
                                                </IconButton>
                                            </TableCell>
                                        ) : null}
                                        {desktopColumns.map((col) => (
                                            <TableCell key={col.id} align={col.align}>
                                                {col.render(row)}
                                            </TableCell>
                                        ))}
                                        {actions ? <TableCell align="right">{actions(row)}</TableCell> : null}
                                    </TableRow>
                                    {renderExpanded ? (
                                        <TableRow>
                                            <TableCell colSpan={1 + desktopColumns.length + (actions ? 1 : 0)}>
                                                <Collapse in={expanded} timeout="auto" unmountOnExit>
                                                    <Box sx={{ py: 1.5 }}>{renderExpanded(row)}</Box>
                                                </Collapse>
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </GlassSurface>
    );
}

