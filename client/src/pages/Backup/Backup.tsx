import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Alert,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
} from '@mui/material';
import { Download as DownloadIcon, Upload as UploadIcon, Backup as BackupIcon } from '@mui/icons-material';
import { backupService, BackupPayload } from '../../services/backupService';
import { useFinancial } from '../../contexts/FinancialContext';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { PageHeader } from '../../components/ui/PageHeader';
import { useTranslation } from 'react-i18next';

const LAST_EXPORT_KEY = 'networth_last_export';

const Backup: React.FC = () => {
    const { t } = useTranslation();
    const { refresh } = useFinancial();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [importCounts, setImportCounts] = useState<Record<string, number> | null>(null);
    const lastExport = localStorage.getItem(LAST_EXPORT_KEY);

    const handleExport = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const res = await backupService.exportAll();
            const data = res.data;
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            a.href = url;
            a.download = `net-worth-backup-${date}.json`;
            a.click();
            URL.revokeObjectURL(url);
            localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
            setMessage({ type: 'success', text: 'Backup downloaded successfully.' });
        } catch {
            setMessage({ type: 'error', text: 'Export failed. Is the server running?' });
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (file: File) => {
        if (!window.confirm('This will replace ALL your data with the backup file. Continue?')) {
            return;
        }
        setLoading(true);
        setMessage(null);
        setImportCounts(null);
        try {
            const text = await file.text();
            const data = JSON.parse(text) as BackupPayload;
            const res = await backupService.importAll(data);
            setImportCounts(res.data.imported);
            setMessage({ type: 'success', text: 'Import completed. Data restored.' });
            await refresh();
        } catch (err) {
            setMessage({
                type: 'error',
                text: err instanceof Error ? err.message : 'Import failed. Check file format.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <PageHeader
                icon={<BackupIcon color="primary" />}
                title={t('pages.backup.title')}
                subtitle={t('pages.backup.subtitle')}
            />
            <Typography variant="body1" color="textSecondary" paragraph>
                Export all your data to a JSON file for safekeeping, or restore from a previous backup.
                Data lives in the Docker Postgres volume — export regularly if you reset the database.
            </Typography>

            {message && (
                <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
                    {message.text}
                </Alert>
            )}

            {lastExport && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Last export on this browser: {new Date(lastExport).toLocaleString()}
                </Alert>
            )}

            <GlassSurface sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Export</Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                    Downloads assets (including investment buckets and return scenarios), liabilities
                    (special repayments, invest-after-payoff), income, expenses, value history, and monthly snapshots.
                </Typography>
                <Button
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                    onClick={handleExport}
                    disabled={loading}
                >
                    Download JSON backup
                </Button>
            </GlassSurface>

            <GlassSurface sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Import</Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                    Replaces all existing data with the contents of a backup file (version 1 or 2 JSON).
                </Typography>
                <Button variant="outlined" component="label" startIcon={<UploadIcon />} disabled={loading}>
                    Choose backup file
                    <input
                        type="file"
                        accept=".json,application/json"
                        hidden
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImport(file);
                            e.target.value = '';
                        }}
                    />
                </Button>
                {importCounts && (
                    <List dense sx={{ mt: 2 }}>
                        {Object.entries(importCounts).map(([key, count]) => (
                            <ListItem key={key}>
                                <ListItemText primary={`${key}: ${count} records`} />
                            </ListItem>
                        ))}
                    </List>
                )}
            </GlassSurface>
        </Box>
    );
};

export default Backup;
