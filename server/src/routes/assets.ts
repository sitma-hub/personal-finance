import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AssetService } from '../services/AssetService';
import { CreateAssetRequest, UpdateAssetRequest } from '../types';

const router = Router();
const assetService = new AssetService();

// Get all assets for the user
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const assets = await assetService.getAllAssets();
    res.json({
        success: true,
        data: assets
    });
}));

// Get a specific asset by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'Asset ID is required' }
        });
    }

    const asset = await assetService.getAssetById(id);

    if (!asset) {
        return res.status(404).json({
            success: false,
            error: { message: 'Asset not found' }
        });
    }

    return res.json({
        success: true,
        data: asset
    });
}));

// Create a new asset
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const assetData: CreateAssetRequest = req.body;
    const asset = await assetService.createAsset(assetData);

    return res.status(201).json({
        success: true,
        data: asset
    });
}));

// Update an existing asset
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'Asset ID is required' }
        });
    }

    const updateData: UpdateAssetRequest = req.body;

    const asset = await assetService.updateAsset(id, updateData);

    if (!asset) {
        return res.status(404).json({
            success: false,
            error: { message: 'Asset not found' }
        });
    }

    return res.json({
        success: true,
        data: asset
    });
}));

// Delete an asset
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'Asset ID is required' }
        });
    }

    const deleted = await assetService.deleteAsset(id);

    if (!deleted) {
        return res.status(404).json({
            success: false,
            error: { message: 'Asset not found' }
        });
    }

    return res.json({
        success: true,
        message: 'Asset deleted successfully'
    });
}));

// Get investment holdings for an asset
router.get('/:id/holdings', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'Asset ID is required' }
        });
    }

    const holdings = await assetService.getInvestmentHoldings(id);

    return res.json({
        success: true,
        data: holdings
    });
}));

// Add investment holding to an asset
router.post('/:id/holdings', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'Asset ID is required' }
        });
    }

    const holdingData = req.body;

    const holding = await assetService.addInvestmentHolding(id, holdingData);

    return res.status(201).json({
        success: true,
        data: holding
    });
}));

// Get real estate properties for an asset
router.get('/:id/properties', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'Asset ID is required' }
        });
    }

    const properties = await assetService.getRealEstateProperties(id);

    return res.json({
        success: true,
        data: properties
    });
}));

// Add real estate property to an asset
router.post('/:id/properties', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'Asset ID is required' }
        });
    }

    const propertyData = req.body;

    const property = await assetService.addRealEstateProperty(id, propertyData);

    return res.status(201).json({
        success: true,
        data: property
    });
}));

export default router;
