"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const DashboardService_1 = require("../services/DashboardService");
const router = (0, express_1.Router)();
const dashboardService = new DashboardService_1.DashboardService();
router.get('/summary', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const summary = await dashboardService.getDashboardSummary();
    return res.json({ success: true, data: summary });
}));
router.get('/asset-allocation', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const allocation = await dashboardService.getAssetAllocation();
    return res.json({ success: true, data: allocation });
}));
router.get('/expense-breakdown', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const breakdown = await dashboardService.getExpenseBreakdown();
    return res.json({ success: true, data: breakdown });
}));
router.get('/history', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const history = await dashboardService.getNetWorthHistory();
    return res.json({ success: true, data: history });
}));
router.get('/net-worth-trend', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const history = await dashboardService.getNetWorthHistory();
    return res.json({ success: true, data: history });
}));
router.get('/recent-updates', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query['limit']) || 15;
    const updates = await dashboardService.getRecentValueUpdates(limit);
    return res.json({ success: true, data: updates });
}));
exports.default = router;
//# sourceMappingURL=dashboard.js.map