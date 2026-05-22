"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const LiabilityService_1 = require("../services/LiabilityService");
const router = (0, express_1.Router)();
const liabilityService = new LiabilityService_1.LiabilityService();
router.get('/', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const liabilities = await liabilityService.getAllLiabilities();
    return res.json({
        success: true,
        data: liabilities
    });
}));
router.get('/:id/history', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = req.params['id'];
    if (!id)
        return res.status(400).json({ success: false, error: { message: 'ID required' } });
    const history = await liabilityService.getBalanceHistory(id);
    return res.json({ success: true, data: history });
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const liabilityData = req.body;
    const liability = await liabilityService.createLiability(liabilityData);
    return res.status(201).json({
        success: true,
        data: liability
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
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
exports.default = router;
//# sourceMappingURL=liabilities.js.map