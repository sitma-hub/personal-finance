import React, { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    Lightbulb as InsightIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Insight } from '../../types';
import { insightService } from '../../services/insightService';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { PageHeader } from '../../components/ui/PageHeader';
import { AiAnalysisPanel, InsightCards } from '../../components/insights';

const Insights: React.FC = () => {
    const { t } = useTranslation();
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await insightService.getInsights();
            setInsights(res.data?.insights ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load insights');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <Box>
            <PageHeader
                icon={<InsightIcon color="primary" />}
                title={t('pages.insights.title')}
                actions={
                    <Button startIcon={<RefreshIcon />} onClick={() => void load()}>
                        {t('common.refresh')}
                    </Button>
                }
            />

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {t('pages.insights.subtitle')}
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <GlassSurface sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    {t('pages.insights.rulesTitle')}
                </Typography>
                {loading ? (
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                ) : insights.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        {t('pages.insights.empty')}
                    </Typography>
                ) : (
                    <InsightCards insights={insights} />
                )}
            </GlassSurface>

            <AiAnalysisPanel />
        </Box>
    );
};

export default Insights;
