"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const IncomeService_1 = require("../services/IncomeService");
const router = (0, express_1.Router)();
const incomeService = new IncomeService_1.IncomeService();
router.get('/', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const incomeStreams = await incomeService.getAllIncomeStreams();
    return res.json({
        success: true,
        data: incomeStreams
    });
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const incomeData = req.body;
    const incomeStream = await incomeService.createIncomeStream(incomeData);
    return res.status(201).json({
        success: true,
        data: incomeStream
    });
}));
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
exports.default = router;
//# sourceMappingURL=income.js.map