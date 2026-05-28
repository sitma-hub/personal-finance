import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { appTokens } from '../theme/tokens';

interface ThemeContextType {
    darkMode: boolean;
    toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

interface ThemeProviderProps {
    children: ReactNode;
}

export const CustomThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        // Default to dark-first if the user has never chosen.
        return saved ? JSON.parse(saved) : true;
    });

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        localStorage.setItem('darkMode', JSON.stringify(newMode));
    };

    useEffect(() => {
        document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    }, [darkMode]);

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: darkMode ? 'dark' : 'light',
                    primary: {
                        main: appTokens.color.accent.teal,
                        dark: appTokens.color.accent.tealDark,
                    },
                    secondary: {
                        main: appTokens.color.accent.amber,
                    },
                    success: {
                        main: '#22C55E',
                    },
                    warning: {
                        main: appTokens.color.accent.amber,
                    },
                    error: {
                        main: '#EF4444',
                    },
                    info: {
                        main: appTokens.color.accent.blue,
                    },
                    divider: darkMode ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)',
                    background: {
                        default: darkMode ? appTokens.color.dark.page : appTokens.color.light.page,
                        paper: darkMode ? appTokens.color.dark.surface : appTokens.color.light.surface,
                    },
                    text: darkMode
                        ? {
                              primary: 'rgba(255,255,255,0.92)',
                              secondary: appTokens.color.dark.textMuted,
                          }
                        : {
                              primary: 'rgba(15,23,42,0.92)',
                              secondary: appTokens.color.light.textMuted,
                          },
                },
                shape: {
                    borderRadius: appTokens.radius,
                },
                typography: {
                    fontFamily:
                        "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
                    h4: { fontWeight: 700, letterSpacing: -0.2 },
                    h5: { fontWeight: 700, letterSpacing: -0.2 },
                    h6: { fontWeight: 650, letterSpacing: -0.1 },
                    subtitle1: { fontWeight: 600 },
                    subtitle2: { fontWeight: 600 },
                },
                components: {
                    MuiCssBaseline: {
                        styleOverrides: {
                            body: {
                                backgroundColor: darkMode ? appTokens.color.dark.page : appTokens.color.light.page,
                                backgroundImage: darkMode
                                    ? 'radial-gradient(1200px 700px at 20% 0%, rgba(20,184,166,0.14), transparent 55%), radial-gradient(900px 600px at 90% 10%, rgba(96,165,250,0.10), transparent 55%)'
                                    : 'radial-gradient(1200px 700px at 20% 0%, rgba(20,184,166,0.08), transparent 55%), radial-gradient(900px 600px at 90% 10%, rgba(96,165,250,0.06), transparent 55%)',
                                backgroundAttachment: 'fixed',
                            },
                        },
                    },
                    MuiPaper: {
                        styleOverrides: {
                            root: {
                                backgroundImage: 'none',
                            },
                        },
                    },
                    MuiCard: {
                        styleOverrides: {
                            root: {
                                backgroundImage: 'none',
                                border: `1px solid ${darkMode ? appTokens.color.dark.border : appTokens.color.light.border}`,
                            },
                        },
                    },
                    MuiAppBar: {
                        defaultProps: {
                            elevation: 0,
                        },
                        styleOverrides: {
                            root: {
                                backgroundImage: 'none',
                            },
                        },
                    },
                    MuiButton: {
                        defaultProps: {
                            disableElevation: true,
                        },
                    },
                    MuiChip: {
                        styleOverrides: {
                            root: {
                                borderRadius: 999,
                            },
                        },
                    },
                    MuiTableCell: {
                        styleOverrides: {
                            head: {
                                fontWeight: 650,
                            },
                        },
                    },
                    MuiDialog: {
                        styleOverrides: {
                            paper: {
                                border: `1px solid ${darkMode ? appTokens.color.dark.border : appTokens.color.light.border}`,
                            },
                        },
                    },
                },
            }),
        [darkMode]
    );

    return (
        <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
};
