import React, { useState, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Button,
    Alert,
    CircularProgress,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import {
    Upload as UploadIcon,
    Download as DownloadIcon,
    Description as DescriptionIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    GetApp as GetAppIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

interface ImportResult {
    success: boolean;
    message: string;
    imported_count: number;
    errors: string[];
    data: any[];
}

interface ExportTemplate {
    dataType: string;
    headers: string[];
    sampleData: any[];
}

const Import: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [importResults, setImportResults] = useState<ImportResult[]>([]);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [selectedDataType, setSelectedDataType] = useState<string>('');

    const dataTypes = [
        { value: 'assets', label: 'Assets', description: 'Savings, investments, real estate, vehicles' },
        { value: 'liabilities', label: 'Liabilities', description: 'Mortgages, loans, credit cards' },
        { value: 'income', label: 'Income', description: 'Salary, freelance, rental income' },
        { value: 'expenses', label: 'Expenses', description: 'Monthly expenses by category' },
    ];

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('dataType', selectedDataType);

        const endpoint = file.name.endsWith('.csv') ? '/api/import/csv' : '/api/import/excel';

        fetch(endpoint, {
            method: 'POST',
            body: formData,
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    setImportResults([data.data, ...importResults]);
                    setSuccess(`Successfully imported ${data.data.imported_count} records`);
                    setPreviewData(data.data.data || []);
                    setPreviewHeaders(Object.keys(data.data.data[0] || {}));
                } else {
                    setError(data.error?.message || 'Import failed');
                }
            })
            .catch(err => {
                setError('Import failed: ' + err.message);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [selectedDataType, importResults]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        },
        multiple: false,
    });

    const downloadTemplate = async (dataType: string) => {
        try {
            const response = await fetch(`/api/import/template/${dataType}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${dataType}_template.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                setError('Failed to download template');
            }
        } catch (err) {
            setError('Failed to download template');
        }
    };

    const exportData = async (dataType: string, format: 'csv' | 'excel') => {
        try {
            const response = await fetch(`/api/import/export/${format}?dataType=${dataType}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${dataType}_export.${format === 'csv' ? 'csv' : 'xlsx'}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                setError('Failed to export data');
            }
        } catch (err) {
            setError('Failed to export data');
        }
    };

    const clearResults = () => {
        setImportResults([]);
        setSuccess(null);
        setError(null);
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Data Import & Export
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Import your financial data from CSV or Excel files, or export existing data for backup and analysis.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Import Section */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Import Data
                        </Typography>

                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel>Data Type</InputLabel>
                            <Select
                                value={selectedDataType}
                                onChange={(e) => setSelectedDataType(e.target.value)}
                            >
                                {dataTypes.map((type) => (
                                    <MenuItem key={type.value} value={type.value}>
                                        <Box>
                                            <Typography variant="body1">{type.label}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {type.description}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {selectedDataType && (
                            <Box sx={{ mb: 3 }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<GetAppIcon />}
                                    onClick={() => downloadTemplate(selectedDataType)}
                                    sx={{ mr: 2 }}
                                >
                                    Download Template
                                </Button>
                                <Typography variant="body2" color="text.secondary">
                                    Download a template CSV file to see the required format
                                </Typography>
                            </Box>
                        )}

                        <Box
                            {...getRootProps()}
                            sx={{
                                border: '2px dashed',
                                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                                borderRadius: 2,
                                p: 4,
                                textAlign: 'center',
                                cursor: 'pointer',
                                backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    backgroundColor: 'action.hover',
                                },
                            }}
                        >
                            <input {...getInputProps()} />
                            <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                or click to select a CSV or Excel file
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                Supported formats: .csv, .xls, .xlsx
                            </Typography>
                        </Box>

                        {loading && (
                            <Box sx={{ mt: 2 }}>
                                <LinearProgress />
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    Processing file...
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Export Section */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Export Data
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Download your data in CSV or Excel format for backup or analysis.
                        </Typography>

                        {dataTypes.map((type) => (
                            <Card key={type.value} sx={{ mb: 2 }}>
                                <CardContent sx={{ py: 2 }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="body1">{type.label}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {type.description}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Tooltip title="Export as CSV">
                                                <IconButton
                                                    onClick={() => exportData(type.value, 'csv')}
                                                    size="small"
                                                >
                                                    <DescriptionIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Export as Excel">
                                                <IconButton
                                                    onClick={() => exportData(type.value, 'excel')}
                                                    size="small"
                                                >
                                                    <DownloadIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </Paper>
                </Grid>

                {/* Import Results */}
                {importResults.length > 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6">
                                    Import Results
                                </Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={clearResults}
                                >
                                    Clear Results
                                </Button>
                            </Box>

                            <List>
                                {importResults.map((result, index) => (
                                    <React.Fragment key={index}>
                                        <ListItem>
                                            <ListItemIcon>
                                                {result.success ? (
                                                    <CheckCircleIcon color="success" />
                                                ) : (
                                                    <ErrorIcon color="error" />
                                                )}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={result.message}
                                                secondary={
                                                    <Box>
                                                        <Typography variant="body2" component="span">
                                                            Imported: {result.imported_count} records
                                                        </Typography>
                                                        {result.errors.length > 0 && (
                                                            <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                                                                Errors: {result.errors.length}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                }
                                            />
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setPreviewData(result.data || []);
                                                    setPreviewHeaders(Object.keys(result.data[0] || {}));
                                                    setPreviewOpen(true);
                                                }}
                                            >
                                                <VisibilityIcon />
                                            </IconButton>
                                        </ListItem>
                                        {index < importResults.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            {/* Data Preview Dialog */}
            <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>
                    Imported Data Preview
                </DialogTitle>
                <DialogContent>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    {previewHeaders.map((header) => (
                                        <TableCell key={header}>{header}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {previewData.slice(0, 10).map((row, index) => (
                                    <TableRow key={index}>
                                        {previewHeaders.map((header) => (
                                            <TableCell key={header}>
                                                {row[header]}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {previewData.length > 10 && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            Showing first 10 rows of {previewData.length} total records
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Import;
