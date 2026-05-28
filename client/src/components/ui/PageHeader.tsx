import React from 'react';
import { Box, Typography } from '@mui/material';

export type PageHeaderProps = {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1,
                mb: 3,
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="h4" sx={{ fontSize: { xs: 26, sm: 30, md: 34 } }}>
                    {title}
                </Typography>
                {subtitle ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {subtitle}
                    </Typography>
                ) : null}
            </Box>
            {actions ? <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box> : null}
        </Box>
    );
}

