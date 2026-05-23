import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { CheckInService } from '../services/CheckInService';
import { ApplyCheckInRequest } from '../types';

const router = Router();
const checkInService = new CheckInService();

router.get('/status', asyncHandler(async (_req: Request, res: Response) => {
  const status = await checkInService.getStatus();
  res.json({ success: true, data: status });
}));

router.get('/proposals/:month', asyncHandler(async (req: Request, res: Response) => {
  const month = req.params['month'];
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ success: false, error: { message: 'Month must be YYYY-MM' } });
  }
  const proposal = await checkInService.getProposal(month);
  return res.json({ success: true, data: proposal });
}));

router.post('/apply', asyncHandler(async (req: Request, res: Response) => {
  const payload = req.body as ApplyCheckInRequest;
  if (!payload?.targetMonth || !payload.assets || !payload.liabilities) {
    return res.status(400).json({
      success: false,
      error: { message: 'targetMonth, assets, and liabilities are required' },
    });
  }
  const snapshot = await checkInService.applyCheckIn(payload);
  return res.status(201).json({ success: true, data: snapshot });
}));

export default router;
