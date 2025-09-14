import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Expenses: React.FC = () => {
    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Expenses
            </Typography>
            <Paper sx={{ p: 3 }}>
                <Typography variant="body1">
                    Expenses management page - Coming soon!
                </Typography>
            </Paper>
        </Box>
    );
};

export default Expenses;
