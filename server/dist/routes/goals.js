"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const GoalService_1 = require("../services/GoalService");
const router = (0, express_1.Router)();
const goalService = new GoalService_1.GoalService();
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const goals = await goalService.getAllGoals();
    res.json({
        success: true,
        data: goals
    });
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const goal = await goalService.getGoalById(id);
    if (!goal) {
        return res.status(404).json({
            success: false,
            error: { message: 'Goal not found' }
        });
    }
    res.json({
        success: true,
        data: goal
    });
}));
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const goalData = req.body;
    const goal = await goalService.createGoal(goalData);
    res.status(201).json({
        success: true,
        data: goal
    });
}));
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const goal = await goalService.updateGoal(id, updateData);
    if (!goal) {
        return res.status(404).json({
            success: false,
            error: { message: 'Goal not found' }
        });
    }
    res.json({
        success: true,
        data: goal
    });
}));
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const deleted = await goalService.deleteGoal(id);
    if (!deleted) {
        return res.status(404).json({
            success: false,
            error: { message: 'Goal not found' }
        });
    }
    res.json({
        success: true,
        message: 'Goal deleted successfully'
    });
}));
router.patch('/:id/achieve', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const goal = await goalService.markGoalAsAchieved(id);
    if (!goal) {
        return res.status(404).json({
            success: false,
            error: { message: 'Goal not found' }
        });
    }
    res.json({
        success: true,
        data: goal
    });
}));
exports.default = router;
//# sourceMappingURL=goals.js.map