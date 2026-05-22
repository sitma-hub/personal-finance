import React, { useState } from 'react';
import {
    AppBar,
    Box,
    CssBaseline,
    Drawer,
    IconButton,
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
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    AccountBalance as AssetsIcon,
    CreditCard as LiabilitiesIcon,
    TrendingUp as IncomeIcon,
    Receipt as ExpensesIcon,
    ShowChart as InvestmentsIcon,
    Backup as BackupIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const drawerWidth = 240;

interface LayoutProps {
    children: React.ReactNode;
}

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Assets', icon: <AssetsIcon />, path: '/assets' },
    { text: 'Liabilities', icon: <LiabilitiesIcon />, path: '/liabilities' },
    { text: 'Income', icon: <IncomeIcon />, path: '/income' },
    { text: 'Expenses', icon: <ExpensesIcon />, path: '/expenses' },
    { text: 'Investments', icon: <InvestmentsIcon />, path: '/investments' },
    { text: 'Backup', icon: <BackupIcon />, path: '/backup' },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const muiTheme = useMuiTheme();
    const { darkMode, toggleDarkMode } = useTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

    const handleNavigation = (path: string) => {
        navigate(path);
        if (isMobile) setMobileOpen(false);
    };

    const drawer = (
        <Box>
            <Toolbar>
                <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
                    Net Worth Tracker
                </Typography>
            </Toolbar>
            <List>
                {menuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            selected={location.pathname === item.path}
                            onClick={() => handleNavigation(item.path)}
                            sx={{
                                '&.Mui-selected': {
                                    backgroundColor: muiTheme.palette.primary.main,
                                    color: 'white',
                                    '&:hover': { backgroundColor: muiTheme.palette.primary.dark },
                                    '& .MuiListItemIcon-root': { color: 'white' },
                                },
                            }}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    ml: { md: `${drawerWidth}px` },
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
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        Personal Net Worth
                    </Typography>
                    <IconButton color="inherit" onClick={toggleDarkMode}>
                        {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                    </IconButton>
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
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
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
                    p: { xs: 2, sm: 3 },
                    width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
                    maxWidth: '100%',
                    mt: 8,
                    boxSizing: 'border-box',
                }}
            >
                {children}
            </Box>
        </Box>
    );
};

export default Layout;
