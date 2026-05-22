import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { BackupService } from '../services/BackupService';

const router = Router();
const backupService = new BackupService();

router.get('/export', asyncHandler(async (_req: Request, res: Response) => {
  const data = await backupService.exportAll();
  res.json({ success: true, data });
}));

router.post('/import', asyncHandler(async (req: Request, res: Response) => {
  const result = await backupService.importAll(req.body);
  res.json({ success: true, data: result });
}));

export default router;
