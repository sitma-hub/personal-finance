import React from 'react';
import { Box, Typography, type SxProps, type Theme } from '@mui/material';
import { GlassSurface } from './GlassSurface';

export type StatCardProps = {
    icon?: React.ReactNode;
    label: React.ReactNode;
    value: React.ReactNode;
    footer?: React.ReactNode;
    sx?: SxProps<Theme>;
};

export function StatCard({ icon, label, value, footer, sx }: StatCardProps) {
    return (
        <GlassSurface sx={[{ p: 2.25 }, ...(Array.isArray(sx) ? sx : [sx])]}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {icon ? <Box sx={{ display: 'grid', placeItems: 'center' }}>{icon}</Box> : null}
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                        {label}
                    </Typography>
                    <Typography
                        variant="h5"
                        sx={{
                            mt: 0.25,
                            fontSize: { xs: 22, sm: 24 },
                            lineHeight: 1.15,
                        }}
                    >
                        {value}
                    </Typography>
                </Box>
            </Box>
            {footer ? (
                <Box sx={{ mt: 1.25 }}>
                    <Typography variant="caption" color="text.secondary">
                        {footer}
                    </Typography>
                </Box>
            ) : null}
        </GlassSurface>
    );
}

