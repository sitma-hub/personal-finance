"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const BackupService_1 = require("../services/BackupService");
const router = (0, express_1.Router)();
const backupService = new BackupService_1.BackupService();
router.get('/export', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const data = await backupService.exportAll();
    res.json({ success: true, data });
}));
router.post('/import', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await backupService.importAll(req.body);
    res.json({ success: true, data: result });
}));
exports.default = router;
//# sourceMappingURL=backup.js.map