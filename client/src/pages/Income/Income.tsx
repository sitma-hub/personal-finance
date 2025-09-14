import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Income: React.FC = () => {
    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Income Streams
            </Typography>
            <Paper sx={{ p: 3 }}>
                <Typography variant="body1">
                    Income streams management page - Coming soon!
                </Typography>
            </Paper>
        </Box>
    );
};

export default Income;
