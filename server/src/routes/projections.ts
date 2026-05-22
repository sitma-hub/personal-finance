import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ProjectionService } from '../services/ProjectionService';

const router = Router();
const projectionService = new ProjectionService();

router.get('/investments', asyncHandler(async (req: Request, res: Response) => {
  const years = Math.min(Math.max(parseInt(req.query['years'] as string) || 10, 1), 40);
  const data = await projectionService.getInvestmentProjections(years);
  return res.json({ success: true, data });
}));

router.get('/net-worth', asyncHandler(async (req: Request, res: Response) => {
  const years = Math.min(Math.max(parseInt(req.query['years'] as string) || 10, 1), 40);
  const data = await projectionService.getNetWorthProjections(years);
  return res.json({ success: true, data });
}));

export default router;
