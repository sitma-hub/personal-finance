import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AssetService } from '../services/AssetService';
import { CreateAssetRequest, UpdateAssetRequest } from '../types';

const router = Router();
const assetService = new AssetService();

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const assets = await assetService.getAllAssets();
  res.json({ success: true, data: assets });
}));

router.get('/:id/history', asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id'];
  if (!id) return res.status(400).json({ success: false, error: { message: 'Asset ID required' } });
  const history = await assetService.getValueHistory(id);
  return res.json({ success: true, data: history });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id'];
  if (!id) return res.status(400).json({ success: false, error: { message: 'Asset ID required' } });
  const asset = await assetService.getAssetById(id);
  if (!asset) {
    return res.status(404).json({ success: false, error: { message: 'Asset not found' } });
  }
  return res.json({ success: true, data: asset });
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const assetData: CreateAssetRequest = req.body;
  const asset = await assetService.createAsset(assetData);
  return res.status(201).json({ success: true, data: asset });
}));

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id'];
  if (!id) return res.status(400).json({ success: false, error: { message: 'Asset ID required' } });
  const asset = await assetService.updateAsset(id, req.body as UpdateAssetRequest);
  if (!asset) {
    return res.status(404).json({ success: false, error: { message: 'Asset not found' } });
  }
  return res.json({ success: true, data: asset });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id'];
  if (!id) return res.status(400).json({ success: false, error: { message: 'Asset ID required' } });
  const deleted = await assetService.deleteAsset(id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: { message: 'Asset not found' } });
  }
  return res.json({ success: true, message: 'Asset deleted successfully' });
}));

export default router;
