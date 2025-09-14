"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const AssetService_1 = require("../services/AssetService");
const router = (0, express_1.Router)();
const assetService = new AssetService_1.AssetService();
router.get('/', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const assets = await assetService.getAllAssets();
    res.json({
        success: true,
        data: assets
    });
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const asset = await assetService.getAssetById(id);
    if (!asset) {
        return res.status(404).json({
            success: false,
            error: { message: 'Asset not found' }
        });
    }
    res.json({
        success: true,
        data: asset
    });
}));
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const assetData = req.body;
    const asset = await assetService.createAsset(assetData);
    res.status(201).json({
        success: true,
        data: asset
    });
}));
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const asset = await assetService.updateAsset(id, updateData);
    if (!asset) {
        return res.status(404).json({
            success: false,
            error: { message: 'Asset not found' }
        });
    }
    res.json({
        success: true,
        data: asset
    });
}));
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const deleted = await assetService.deleteAsset(id);
    if (!deleted) {
        return res.status(404).json({
            success: false,
            error: { message: 'Asset not found' }
        });
    }
    res.json({
        success: true,
        message: 'Asset deleted successfully'
    });
}));
router.get('/:id/holdings', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const holdings = await assetService.getInvestmentHoldings(id);
    res.json({
        success: true,
        data: holdings
    });
}));
router.post('/:id/holdings', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const holdingData = req.body;
    const holding = await assetService.addInvestmentHolding(id, holdingData);
    res.status(201).json({
        success: true,
        data: holding
    });
}));
router.get('/:id/properties', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const properties = await assetService.getRealEstateProperties(id);
    res.json({
        success: true,
        data: properties
    });
}));
router.post('/:id/properties', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const propertyData = req.body;
    const property = await assetService.addRealEstateProperty(id, propertyData);
    res.status(201).json({
        success: true,
        data: property
    });
}));
exports.default = router;
//# sourceMappingURL=assets.js.map