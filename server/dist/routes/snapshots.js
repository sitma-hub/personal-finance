"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const SnapshotService_1 = require("../services/SnapshotService");
const router = (0, express_1.Router)();
const snapshotService = new SnapshotService_1.SnapshotService();
router.get('/', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const snapshots = await snapshotService.getAllSnapshots();
    res.json({ success: true, data: snapshots });
}));
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { snapshot_month, notes } = req.body;
    const snapshot = await snapshotService.createSnapshot(snapshot_month, notes);
    res.status(201).json({ success: true, data: snapshot });
}));
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = req.params['id'];
    if (!id)
        return res.status(400).json({ success: false, error: { message: 'Snapshot ID required' } });
    const deleted = await snapshotService.deleteSnapshot(id);
    if (!deleted) {
        return res.status(404).json({ success: false, error: { message: 'Snapshot not found' } });
    }
    return res.json({ success: true, message: 'Snapshot deleted' });
}));
exports.default = router;
//# sourceMappingURL=snapshots.js.map