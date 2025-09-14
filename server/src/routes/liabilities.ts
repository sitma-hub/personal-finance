import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { LiabilityService } from '../services/LiabilityService';

const router = Router();
const liabilityService = new LiabilityService();

// Get all liabilities for the user
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const liabilities = await liabilityService.getAllLiabilities();
    return res.json({
        success: true,
        data: liabilities
    });
}));

// Get a specific liability by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'ID is required' }
        });
    }
    const liability = await liabilityService.getLiabilityById(id);

    if (!liability) {
        return res.status(404).json({
            success: false,
            error: { message: 'Liability not found' }
        });
    }

    return res.json({
        success: true,
        data: liability
    });
}));

// Create a new liability
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const liabilityData = req.body;
    const liability = await liabilityService.createLiability(liabilityData);

    return res.status(201).json({
        success: true,
        data: liability
    });
}));

// Update an existing liability
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'ID is required' }
        });
    }
    const updateData = req.body;
    const liability = await liabilityService.updateLiability(id, updateData);

    if (!liability) {
        return res.status(404).json({
            success: false,
            error: { message: 'Liability not found' }
        });
    }

    return res.json({
        success: true,
        data: liability
    });
}));

// Delete a liability
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'ID is required' }
        });
    }
    const deleted = await liabilityService.deleteLiability(id);

    if (!deleted) {
        return res.status(404).json({
            success: false,
            error: { message: 'Liability not found' }
        });
    }

    return res.json({
        success: true,
        message: 'Liability deleted successfully'
    });
}));

export default router;
