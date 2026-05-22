import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { SnapshotService } from '../services/SnapshotService';

const router = Router();
const snapshotService = new SnapshotService();

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const snapshots = await snapshotService.getAllSnapshots();
  res.json({ success: true, data: snapshots });
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { snapshot_month, notes } = req.body;
  const snapshot = await snapshotService.createSnapshot(snapshot_month, notes);
  res.status(201).json({ success: true, data: snapshot });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id'];
  if (!id) return res.status(400).json({ success: false, error: { message: 'Snapshot ID required' } });
  const deleted = await snapshotService.deleteSnapshot(id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: { message: 'Snapshot not found' } });
  }
  return res.json({ success: true, message: 'Snapshot deleted' });
}));

export default router;
