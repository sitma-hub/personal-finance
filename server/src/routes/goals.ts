import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { GoalService } from '../services/GoalService';

const router = Router();
const goalService = new GoalService();

// Get all goals for the user
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const goals = await goalService.getAllGoals();
    return res.json({
        success: true,
        data: goals
    });
}));

// Get a specific goal by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'ID is required' }
        });
    }
    const goal = await goalService.getGoalById(id);

    if (!goal) {
        return res.status(404).json({
            success: false,
            error: { message: 'Goal not found' }
        });
    }

    return res.json({
        success: true,
        data: goal
    });
}));

// Create a new goal
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const goalData = req.body;
    const goal = await goalService.createGoal(goalData);

    return res.status(201).json({
        success: true,
        data: goal
    });
}));

// Update an existing goal
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'Goal ID is required' }
        });
    }
    const updateData = req.body;

    const goal = await goalService.updateGoal(id, updateData);

    if (!goal) {
        return res.status(404).json({
            success: false,
            error: { message: 'Goal not found' }
        });
    }

    return res.json({
        success: true,
        data: goal
    });
}));

// Delete a goal
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'ID is required' }
        });
    }
    const deleted = await goalService.deleteGoal(id);

    if (!deleted) {
        return res.status(404).json({
            success: false,
            error: { message: 'Goal not found' }
        });
    }

    return res.json({
        success: true,
        message: 'Goal deleted successfully'
    });
}));

// Mark goal as achieved
router.patch('/:id/achieve', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'ID is required' }
        });
    }
    const goal = await goalService.markGoalAsAchieved(id);

    if (!goal) {
        return res.status(404).json({
            success: false,
            error: { message: 'Goal not found' }
        });
    }

    return res.json({
        success: true,
        data: goal
    });
}));

// Reset goal achievement status
router.patch('/:id/reset', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'ID is required' }
        });
    }
    const goal = await goalService.resetGoalAchievement(id);

    if (!goal) {
        return res.status(404).json({
            success: false,
            error: { message: 'Goal not found' }
        });
    }

    return res.json({
        success: true,
        data: goal
    });
}));

export default router;
