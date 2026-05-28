import React, { useState } from 'react';
import {
    AppBar,
    Box,
    Drawer,
    IconButton,
    Menu,
    MenuItem,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
    useTheme as useMuiTheme,
    useMediaQuery,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    AccountBalance as AssetsIcon,
    CreditCard as LiabilitiesIcon,
    TrendingUp as IncomeIcon,
    Receipt as ExpensesIcon,
    ShowChart as InvestmentsIcon,
    EventNote as CheckInIcon,
    Backup as BackupIcon,
    Translate as TranslateIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const drawerWidth = 240;

interface LayoutProps {
    children: React.ReactNode;
}

const menuItems = [
    { key: 'nav.dashboard', icon: <DashboardIcon />, path: '/' },
    { key: 'nav.checkIn', icon: <CheckInIcon />, path: '/check-in' },
    { key: 'nav.assets', icon: <AssetsIcon />, path: '/assets' },
    { key: 'nav.liabilities', icon: <LiabilitiesIcon />, path: '/liabilities' },
    { key: 'nav.income', icon: <IncomeIcon />, path: '/income' },
    { key: 'nav.expenses', icon: <ExpensesIcon />, path: '/expenses' },
    { key: 'nav.investments', icon: <InvestmentsIcon />, path: '/investments' },
    { key: 'nav.backup', icon: <BackupIcon />, path: '/backup' },
] as const;

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const muiTheme = useMuiTheme();
    const { darkMode, toggleDarkMode } = useTheme();
    const { t, i18n } = useTranslation();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null);
    const navigate = useNavigate();
    const location = useLocation();

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

    const handleNavigation = (path: string) => {
        navigate(path);
        if (isMobile) setMobileOpen(false);
    };

    const openLangMenu = (e: React.MouseEvent<HTMLElement>) => setLangAnchorEl(e.currentTarget);
    const closeLangMenu = () => setLangAnchorEl(null);
    const setLanguage = (lng: 'en' | 'de') => {
        void i18n.changeLanguage(lng);
        closeLangMenu();
    };

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Toolbar>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                        sx={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: `linear-gradient(135deg, ${muiTheme.palette.primary.main}, ${muiTheme.palette.info.main})`,
                            boxShadow: `0 0 0 6px ${alpha(muiTheme.palette.primary.main, 0.12)}`,
                            flex: '0 0 auto',
                        }}
                    />
                    <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 800, letterSpacing: -0.2 }}>
                        {t('app.name')}
                    </Typography>
                </Box>
            </Toolbar>
            <List sx={{ px: 1 }}>
                {menuItems.map((item) => (
                    <ListItem key={item.key} disablePadding>
                        <ListItemButton
                            selected={location.pathname === item.path}
                            onClick={() => handleNavigation(item.path)}
                            sx={{
                                position: 'relative',
                                borderRadius: 2,
                                '&.Mui-selected': {
                                    backgroundColor: alpha(
                                        muiTheme.palette.primary.main,
                                        muiTheme.palette.mode === 'dark' ? 0.18 : 0.12
                                    ),
                                    color: muiTheme.palette.text.primary,
                                    '&:hover': {
                                        backgroundColor: alpha(
                                            muiTheme.palette.primary.main,
                                            muiTheme.palette.mode === 'dark' ? 0.24 : 0.16
                                        ),
                                    },
                                    '& .MuiListItemIcon-root': { color: muiTheme.palette.primary.main },
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        left: 8,
                                        top: 10,
                                        bottom: 10,
                                        width: 3,
                                        borderRadius: 999,
                                        backgroundColor: muiTheme.palette.primary.main,
                                        boxShadow: `0 0 0 6px ${alpha(muiTheme.palette.primary.main, 0.10)}`,
                                    },
                                },
                            }}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={t(item.key)} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar
                position="fixed"
                sx={{
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    ml: { md: `${drawerWidth}px` },
                    backgroundColor: alpha(
                        muiTheme.palette.background.paper,
                        muiTheme.palette.mode === 'dark' ? 0.65 : 0.8
                    ),
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderBottom: `1px solid ${muiTheme.palette.divider}`,
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { md: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography
                        variant="h6"
                        noWrap
                        component="div"
                        sx={{ flexGrow: 1, fontWeight: 750, letterSpacing: -0.2 }}
                    >
                        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                            {t('app.title')}
                        </Box>
                        <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                            {t('app.titleShort')}
                        </Box>
                    </Typography>
                    <IconButton color="inherit" onClick={openLangMenu} aria-label="language">
                        <TranslateIcon />
                    </IconButton>
                    <IconButton color="inherit" onClick={toggleDarkMode}>
                        {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                    </IconButton>
                    <Menu
                        anchorEl={langAnchorEl}
                        open={Boolean(langAnchorEl)}
                        onClose={closeLangMenu}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                        <MenuItem selected={i18n.language.startsWith('en')} onClick={() => setLanguage('en')}>
                            English
                        </MenuItem>
                        <MenuItem selected={i18n.language.startsWith('de')} onClick={() => setLanguage('de')}>
                            Deutsch
                        </MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>
            <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                            backgroundImage: 'none',
                            backgroundColor: alpha(
                                muiTheme.palette.background.paper,
                                muiTheme.palette.mode === 'dark' ? 0.75 : 0.92
                            ),
                            backdropFilter: 'blur(14px)',
                            WebkitBackdropFilter: 'blur(14px)',
                            borderRight: `1px solid ${muiTheme.palette.divider}`,
                        },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                            backgroundImage: 'none',
                            backgroundColor: alpha(
                                muiTheme.palette.background.paper,
                                muiTheme.palette.mode === 'dark' ? 0.70 : 0.92
                            ),
                            backdropFilter: 'blur(14px)',
                            WebkitBackdropFilter: 'blur(14px)',
                            borderRight: `1px solid ${muiTheme.palette.divider}`,
                        },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    p: { xs: 2, sm: 3, lg: 4 },
                    width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
                    maxWidth: '100%',
                    mt: 8,
                    boxSizing: 'border-box',
                }}
            >
                <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>{children}</Box>
            </Box>
        </Box>
    );
};

export default Layout;
