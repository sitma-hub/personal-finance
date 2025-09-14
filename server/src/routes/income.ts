import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { IncomeService } from '../services/IncomeService';

const router = Router();
const incomeService = new IncomeService();

// Get all income streams for the user
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const incomeStreams = await incomeService.getAllIncomeStreams();
    return res.json({
        success: true,
        data: incomeStreams
    });
}));

// Get a specific income stream by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'ID is required' }
        });
    }
    const incomeStream = await incomeService.getIncomeStreamById(id);

    if (!incomeStream) {
        return res.status(404).json({
            success: false,
            error: { message: 'Income stream not found' }
        });
    }

    return res.json({
        success: true,
        data: incomeStream
    });
}));

// Create a new income stream
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const incomeData = req.body;
    const incomeStream = await incomeService.createIncomeStream(incomeData);

    return res.status(201).json({
        success: true,
        data: incomeStream
    });
}));

// Update an existing income stream
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'ID is required' }
        });
    }
    const updateData = req.body;
    const incomeStream = await incomeService.updateIncomeStream(id, updateData);

    if (!incomeStream) {
        return res.status(404).json({
            success: false,
            error: { message: 'Income stream not found' }
        });
    }

    return res.json({
        success: true,
        data: incomeStream
    });
}));

// Delete an income stream
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'ID is required' }
        });
    }
    const deleted = await incomeService.deleteIncomeStream(id);

    if (!deleted) {
        return res.status(404).json({
            success: false,
            error: { message: 'Income stream not found' }
        });
    }

    return res.json({
        success: true,
        message: 'Income stream deleted successfully'
    });
}));

export default router;
