"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const AssetService_1 = require("../services/AssetService");
const router = (0, express_1.Router)();
const assetService = new AssetService_1.AssetService();
router.get('/', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const assets = await assetService.getAllAssets();
    res.json({ success: true, data: assets });
}));
router.get('/:id/history', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = req.params['id'];
    if (!id)
        return res.status(400).json({ success: false, error: { message: 'Asset ID required' } });
    const history = await assetService.getValueHistory(id);
    return res.json({ success: true, data: history });
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = req.params['id'];
    if (!id)
        return res.status(400).json({ success: false, error: { message: 'Asset ID required' } });
    const asset = await assetService.getAssetById(id);
    if (!asset) {
        return res.status(404).json({ success: false, error: { message: 'Asset not found' } });
    }
    return res.json({ success: true, data: asset });
}));
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const assetData = req.body;
    const asset = await assetService.createAsset(assetData);
    return res.status(201).json({ success: true, data: asset });
}));
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = req.params['id'];
    if (!id)
        return res.status(400).json({ success: false, error: { message: 'Asset ID required' } });
    const asset = await assetService.updateAsset(id, req.body);
    if (!asset) {
        return res.status(404).json({ success: false, error: { message: 'Asset not found' } });
    }
    return res.json({ success: true, data: asset });
}));
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = req.params['id'];
    if (!id)
        return res.status(400).json({ success: false, error: { message: 'Asset ID required' } });
    const deleted = await assetService.deleteAsset(id);
    if (!deleted) {
        return res.status(404).json({ success: false, error: { message: 'Asset not found' } });
    }
    return res.json({ success: true, message: 'Asset deleted successfully' });
}));
exports.default = router;
//# sourceMappingURL=assets.js.map