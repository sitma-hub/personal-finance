import React from 'react';
import { Alert, AlertTitle, Box, Chip, Stack } from '@mui/material';
import type { AlertColor } from '@mui/material';
import { Insight, InsightSeverity } from '../../types';

const SEVERITY_TO_COLOR: Record<InsightSeverity, AlertColor> = {
    critical: 'error',
    warning: 'warning',
    info: 'info',
    positive: 'success',
};

interface InsightCardsProps {
    insights: Insight[];
    showMetrics?: boolean;
}

export const InsightCards: React.FC<InsightCardsProps> = ({ insights, showMetrics = true }) => {
    return (
        <Stack spacing={2}>
            {insights.map((insight) => (
                <Alert key={insight.id} severity={SEVERITY_TO_COLOR[insight.severity]} variant="outlined">
                    <AlertTitle>{insight.title}</AlertTitle>
                    {insight.detail}
                    {showMetrics && insight.metrics && insight.metrics.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {insight.metrics.map((m, i) => (
                                <Chip
                                    key={`${insight.id}-${i}`}
                                    size="small"
                                    variant="outlined"
                                    label={`${m.label}: ${m.value}`}
                                />
                            ))}
                        </Box>
                    )}
                </Alert>
            ))}
        </Stack>
    );
};
