"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const ExpenseService_1 = require("../services/ExpenseService");
const router = (0, express_1.Router)();
const expenseService = new ExpenseService_1.ExpenseService();
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const expenses = await expenseService.getAllExpenses();
    res.json({
        success: true,
        data: expenses
    });
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const expense = await expenseService.getExpenseById(id);
    if (!expense) {
        return res.status(404).json({
            success: false,
            error: { message: 'Expense not found' }
        });
    }
    res.json({
        success: true,
        data: expense
    });
}));
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const expenseData = req.body;
    const expense = await expenseService.createExpense(expenseData);
    res.status(201).json({
        success: true,
        data: expense
    });
}));
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const expense = await expenseService.updateExpense(id, updateData);
    if (!expense) {
        return res.status(404).json({
            success: false,
            error: { message: 'Expense not found' }
        });
    }
    res.json({
        success: true,
        data: expense
    });
}));
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const deleted = await expenseService.deleteExpense(id);
    if (!deleted) {
        return res.status(404).json({
            success: false,
            error: { message: 'Expense not found' }
        });
    }
    res.json({
        success: true,
        message: 'Expense deleted successfully'
    });
}));
exports.default = router;
//# sourceMappingURL=expenses.js.map