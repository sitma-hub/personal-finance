import React from 'react';
import { Box, Typography } from '@mui/material';

export type PageHeaderProps = {
    icon?: React.ReactNode;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
};

export function PageHeader({ icon, title, subtitle, actions }: PageHeaderProps) {
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    {icon ? <Box sx={{ display: 'grid', placeItems: 'center' }}>{icon}</Box> : null}
                    <Typography variant="h4" sx={{ fontSize: { xs: 26, sm: 30, md: 34 } }}>
                        {title}
                    </Typography>
                </Box>
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

