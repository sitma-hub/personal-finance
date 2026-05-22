import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/Layout/Layout';
import UnifiedDashboard from './pages/Dashboard/UnifiedDashboard';
import Assets from './pages/Assets/Assets';
import Liabilities from './pages/Liabilities/Liabilities';
import Income from './pages/Income/Income';
import Expenses from './pages/Expenses/Expenses';
import Backup from './pages/Backup/Backup';
import Investments from './pages/Investments/Investments';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { FinancialProvider } from './contexts/FinancialContext';

function App() {
    return (
        <CustomThemeProvider>
            <FinancialProvider>
                <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                    <Layout>
                        <Routes>
                            <Route path="/" element={<UnifiedDashboard />} />
                            <Route path="/assets" element={<Assets />} />
                            <Route path="/liabilities" element={<Liabilities />} />
                            <Route path="/income" element={<Income />} />
                            <Route path="/expenses" element={<Expenses />} />
                            <Route path="/investments" element={<Investments />} />
                            <Route path="/backup" element={<Backup />} />
                        </Routes>
                    </Layout>
                </Box>
            </FinancialProvider>
        </CustomThemeProvider>
    );
}

export default App;
