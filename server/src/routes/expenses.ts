import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ExpenseService } from '../services/ExpenseService';

const router = Router();
const expenseService = new ExpenseService();

// Get all expenses for the user
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const expenses = await expenseService.getAllExpenses();
    return res.json({
        success: true,
        data: expenses
    });
}));

// Get a specific expense by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'Expense ID is required' }
        });
    }
    const expense = await expenseService.getExpenseById(id);

    if (!expense) {
        return res.status(404).json({
            success: false,
            error: { message: 'Expense not found' }
        });
    }

    return res.json({
        success: true,
        data: expense
    });
}));

// Create a new expense
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const expenseData = req.body;
    const expense = await expenseService.createExpense(expenseData);

    return res.status(201).json({
        success: true,
        data: expense
    });
}));

// Update an existing expense
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'Expense ID is required' }
        });
    }
    const updateData = req.body;

    const expense = await expenseService.updateExpense(id, updateData);

    if (!expense) {
        return res.status(404).json({
            success: false,
            error: { message: 'Expense not found' }
        });
    }

    return res.json({
        success: true,
        data: expense
    });
}));

// Delete an expense
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'Expense ID is required' }
        });
    }
    const deleted = await expenseService.deleteExpense(id);

    if (!deleted) {
        return res.status(404).json({
            success: false,
            error: { message: 'Expense not found' }
        });
    }

    return res.json({
        success: true,
        message: 'Expense deleted successfully'
    });
}));

export default router;
