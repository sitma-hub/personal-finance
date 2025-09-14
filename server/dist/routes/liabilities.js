"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const LiabilityService_1 = require("../services/LiabilityService");
const router = (0, express_1.Router)();
const liabilityService = new LiabilityService_1.LiabilityService();
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const liabilities = await liabilityService.getAllLiabilities();
    res.json({
        success: true,
        data: liabilities
    });
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const liability = await liabilityService.getLiabilityById(id);
    if (!liability) {
        return res.status(404).json({
            success: false,
            error: { message: 'Liability not found' }
        });
    }
    res.json({
        success: true,
        data: liability
    });
}));
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const liabilityData = req.body;
    const liability = await liabilityService.createLiability(liabilityData);
    res.status(201).json({
        success: true,
        data: liability
    });
}));
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const liability = await liabilityService.updateLiability(id, updateData);
    if (!liability) {
        return res.status(404).json({
            success: false,
            error: { message: 'Liability not found' }
        });
    }
    res.json({
        success: true,
        data: liability
    });
}));
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const deleted = await liabilityService.deleteLiability(id);
    if (!deleted) {
        return res.status(404).json({
            success: false,
            error: { message: 'Liability not found' }
        });
    }
    res.json({
        success: true,
        message: 'Liability deleted successfully'
    });
}));
exports.default = router;
//# sourceMappingURL=liabilities.js.map