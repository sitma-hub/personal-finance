import { Router, Request, Response } from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/errorHandler';
import { ImportService } from '../services/ImportService';

const router = Router();
const importService = new ImportService();

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: parseInt(process.env['MAX_FILE_SIZE'] || '10485760') // 10MB default
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
        }
    }
});

// Import data from CSV file
router.post('/csv', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: { message: 'No file uploaded' }
        });
    }

    const { dataType } = req.body; // 'assets', 'liabilities', 'income', 'expenses'

    if (!dataType) {
        return res.status(400).json({
            success: false,
            error: { message: 'Data type is required' }
        });
    }

    const result = await importService.importFromCSV(req.file.path, dataType);

    return res.json({
        success: true,
        data: result
    });
}));

// Import data from Excel file
router.post('/excel', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: { message: 'No file uploaded' }
        });
    }

    const { dataType } = req.body; // 'assets', 'liabilities', 'income', 'expenses'

    if (!dataType) {
        return res.status(400).json({
            success: false,
            error: { message: 'Data type is required' }
        });
    }

    const result = await importService.importFromExcel(req.file.path, dataType);

    return res.json({
        success: true,
        data: result
    });
}));

// Export data to CSV
router.get('/export/csv', asyncHandler(async (req: Request, res: Response) => {
    const { dataType } = req.query;

    if (!dataType) {
        return res.status(400).json({
            success: false,
            error: { message: 'Data type is required' }
        });
    }

    const csvData = await importService.exportToCSV(dataType as string);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${dataType}_export.csv"`);
    return res.send(csvData);
}));

// Export data to Excel
router.get('/export/excel', asyncHandler(async (req: Request, res: Response) => {
    const { dataType } = req.query;

    if (!dataType) {
        return res.status(400).json({
            success: false,
            error: { message: 'Data type is required' }
        });
    }

    const excelBuffer = await importService.exportToExcel(dataType as string);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${dataType}_export.xlsx"`);
    return res.send(excelBuffer);
}));

// Get import template
router.get('/template/:dataType', asyncHandler(async (req: Request, res: Response) => {
    const { dataType } = req.params;
    if (!dataType) {
        return res.status(400).json({
            success: false,
            error: { message: 'Data type is required' }
        });
    }

    const template = await importService.getImportTemplate(dataType);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${dataType}_template.csv"`);
    return res.send(template);
}));

export default router;
