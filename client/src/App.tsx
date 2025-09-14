import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/Layout/Layout';
import UnifiedDashboard from './pages/Dashboard/UnifiedDashboard';
import Assets from './pages/Assets/Assets';
import Liabilities from './pages/Liabilities/Liabilities';
import Income from './pages/Income/Income';
import Expenses from './pages/Expenses/Expenses';
import Scenarios from './pages/Scenarios/Scenarios';
import Goals from './pages/Goals/Goals';
import Import from './pages/Import/Import';
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
                            <Route path="/scenarios" element={<Scenarios />} />
                            <Route path="/goals" element={<Goals />} />
                            <Route path="/import" element={<Import />} />
                        </Routes>
                    </Layout>
                </Box>
            </FinancialProvider>
        </CustomThemeProvider>
    );
}

export default App;
