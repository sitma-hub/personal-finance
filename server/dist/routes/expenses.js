"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const ExpenseService_1 = require("../services/ExpenseService");
const router = (0, express_1.Router)();
const expenseService = new ExpenseService_1.ExpenseService();
router.get('/', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const expenses = await expenseService.getAllExpenses();
    return res.json({
        success: true,
        data: expenses
    });
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const expenseData = req.body;
    const expense = await expenseService.createExpense(expenseData);
    return res.status(201).json({
        success: true,
        data: expense
    });
}));
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
exports.default = router;
//# sourceMappingURL=expenses.js.map