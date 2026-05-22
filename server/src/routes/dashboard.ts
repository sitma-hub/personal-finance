import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { DashboardService } from '../services/DashboardService';

const router = Router();
const dashboardService = new DashboardService();

router.get('/summary', asyncHandler(async (_req: Request, res: Response) => {
  const summary = await dashboardService.getDashboardSummary();
  return res.json({ success: true, data: summary });
}));

router.get('/asset-allocation', asyncHandler(async (_req: Request, res: Response) => {
  const allocation = await dashboardService.getAssetAllocation();
  return res.json({ success: true, data: allocation });
}));

router.get('/expense-breakdown', asyncHandler(async (_req: Request, res: Response) => {
  const breakdown = await dashboardService.getExpenseBreakdown();
  return res.json({ success: true, data: breakdown });
}));

router.get('/history', asyncHandler(async (_req: Request, res: Response) => {
  const history = await dashboardService.getNetWorthHistory();
  return res.json({ success: true, data: history });
}));

router.get('/net-worth-trend', asyncHandler(async (_req: Request, res: Response) => {
  const history = await dashboardService.getNetWorthHistory();
  return res.json({ success: true, data: history });
}));

router.get('/recent-updates', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query['limit'] as string) || 15;
  const updates = await dashboardService.getRecentValueUpdates(limit);
  return res.json({ success: true, data: updates });
}));

export default router;
