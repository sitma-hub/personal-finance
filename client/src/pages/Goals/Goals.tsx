import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Goals: React.FC = () => {
    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Financial Goals
            </Typography>
            <Paper sx={{ p: 3 }}>
                <Typography variant="body1">
                    Financial goals management page - Coming soon!
                </Typography>
            </Paper>
        </Box>
    );
};

export default Goals;
