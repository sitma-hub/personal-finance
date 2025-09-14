import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { DashboardService } from '../services/DashboardService';

const router = Router();
const dashboardService = new DashboardService();

// Get dashboard summary
router.get('/summary', asyncHandler(async (_req: Request, res: Response) => {
    const summary = await dashboardService.getDashboardSummary();
    return res.json({
        success: true,
        data: summary
    });
}));

// Get asset allocation breakdown
router.get('/asset-allocation', asyncHandler(async (_req: Request, res: Response) => {
    const allocation = await dashboardService.getAssetAllocation();
    return res.json({
        success: true,
        data: allocation
    });
}));

// Get expense breakdown
router.get('/expense-breakdown', asyncHandler(async (_req: Request, res: Response) => {
    const breakdown = await dashboardService.getExpenseBreakdown();
    return res.json({
        success: true,
        data: breakdown
    });
}));

// Get net worth trend
router.get('/net-worth-trend', asyncHandler(async (req: Request, res: Response) => {
    const months = parseInt(req.query['months'] as string) || 6;
    const trend = await dashboardService.getNetWorthTrend(months);
    return res.json({
        success: true,
        data: trend
    });
}));

// Get goals progress
router.get('/goals-progress', asyncHandler(async (_req: Request, res: Response) => {
    const progress = await dashboardService.getGoalsProgress();
    return res.json({
        success: true,
        data: progress
    });
}));

// Get recent activity
router.get('/recent-activity', asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query['limit'] as string) || 10;
    const activity = await dashboardService.getRecentActivity(limit);
    return res.json({
        success: true,
        data: activity
    });
}));

// Run quick scenario
router.post('/quick-scenario', asyncHandler(async (req: Request, res: Response) => {
    const { scenarioType, parameters } = req.body;
    const result = await dashboardService.runQuickScenario(scenarioType, parameters);
    return res.json({
        success: true,
        data: result
    });
}));

// Get Monte Carlo preview
router.get('/monte-carlo-preview', asyncHandler(async (_req: Request, res: Response) => {
    const preview = await dashboardService.getMonteCarloPreview();
    return res.json({
        success: true,
        data: preview
    });
}));

export default router;
