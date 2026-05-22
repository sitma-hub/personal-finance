"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const ProjectionService_1 = require("../services/ProjectionService");
const router = (0, express_1.Router)();
const projectionService = new ProjectionService_1.ProjectionService();
router.get('/investments', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const years = Math.min(Math.max(parseInt(req.query['years']) || 10, 1), 40);
    const data = await projectionService.getInvestmentProjections(years);
    return res.json({ success: true, data });
}));
router.get('/net-worth', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const years = Math.min(Math.max(parseInt(req.query['years']) || 10, 1), 40);
    const data = await projectionService.getNetWorthProjections(years);
    return res.json({ success: true, data });
}));
exports.default = router;
//# sourceMappingURL=projections.js.map