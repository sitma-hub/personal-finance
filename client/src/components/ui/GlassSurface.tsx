import React from 'react';
import { Paper, type PaperProps } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

export type GlassSurfaceProps = PaperProps & {
    borderless?: boolean;
};

export function GlassSurface({ borderless, sx, ...props }: GlassSurfaceProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Paper
            {...props}
            sx={[
                {
                    position: 'relative',
                    overflow: 'hidden',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    backgroundColor: isDark
                        ? alpha(theme.palette.background.paper, 0.72)
                        : alpha(theme.palette.background.paper, 0.86),
                    border: borderless ? undefined : `1px solid ${theme.palette.divider}`,
                    boxShadow: isDark
                        ? '0 10px 30px rgba(0,0,0,0.35)'
                        : '0 10px 30px rgba(2,6,23,0.10)',
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
        />
    );
}

