"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const errorHandler_1 = require("../middleware/errorHandler");
const ImportService_1 = require("../services/ImportService");
const router = (0, express_1.Router)();
const importService = new ImportService_1.ImportService();
const upload = (0, multer_1.default)({
    dest: 'uploads/',
    limits: {
        fileSize: parseInt(process.env['MAX_FILE_SIZE'] || '10485760')
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
        }
    }
});
router.post('/csv', upload.single('file'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: { message: 'No file uploaded' }
        });
    }
    const { dataType } = req.body;
    if (!dataType) {
        return res.status(400).json({
            success: false,
            error: { message: 'Data type is required' }
        });
    }
    const result = await importService.importFromCSV(req.file.path, dataType);
    res.json({
        success: true,
        data: result
    });
}));
router.post('/excel', upload.single('file'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: { message: 'No file uploaded' }
        });
    }
    const { dataType } = req.body;
    if (!dataType) {
        return res.status(400).json({
            success: false,
            error: { message: 'Data type is required' }
        });
    }
    const result = await importService.importFromExcel(req.file.path, dataType);
    res.json({
        success: true,
        data: result
    });
}));
router.get('/export/csv', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { dataType } = req.query;
    if (!dataType) {
        return res.status(400).json({
            success: false,
            error: { message: 'Data type is required' }
        });
    }
    const csvData = await importService.exportToCSV(dataType);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${dataType}_export.csv"`);
    res.send(csvData);
}));
router.get('/export/excel', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { dataType } = req.query;
    if (!dataType) {
        return res.status(400).json({
            success: false,
            error: { message: 'Data type is required' }
        });
    }
    const excelBuffer = await importService.exportToExcel(dataType);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${dataType}_export.xlsx"`);
    res.send(excelBuffer);
}));
router.get('/template/:dataType', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { dataType } = req.params;
    const template = await importService.getImportTemplate(dataType);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${dataType}_template.csv"`);
    res.send(template);
}));
exports.default = router;
//# sourceMappingURL=import.js.map