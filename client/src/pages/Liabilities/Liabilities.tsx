import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Liabilities: React.FC = () => {
    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Liabilities
            </Typography>
            <Paper sx={{ p: 3 }}>
                <Typography variant="body1">
                    Liabilities management page - Coming soon!
                </Typography>
            </Paper>
        </Box>
    );
};

export default Liabilities;
