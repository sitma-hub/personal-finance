"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const assets_1 = __importDefault(require("./routes/assets"));
const liabilities_1 = __importDefault(require("./routes/liabilities"));
const income_1 = __importDefault(require("./routes/income"));
const expenses_1 = __importDefault(require("./routes/expenses"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const snapshots_1 = __importDefault(require("./routes/snapshots"));
const backup_1 = __importDefault(require("./routes/backup"));
const projections_1 = __importDefault(require("./routes/projections"));
const errorHandler_1 = require("./middleware/errorHandler");
const notFound_1 = require("./middleware/notFound");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env['PORT'] || 5000;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
    credentials: true
}));
app.use((0, compression_1.default)());
if (process.env['NODE_ENV'] === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
}
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
app.use('/api/assets', assets_1.default);
app.use('/api/liabilities', liabilities_1.default);
app.use('/api/income', income_1.default);
app.use('/api/expenses', expenses_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/snapshots', snapshots_1.default);
app.use('/api/backup', backup_1.default);
app.use('/api/projections', projections_1.default);
app.get('/api', (_req, res) => {
    res.json({
        name: 'Personal Net Worth Tracker API',
        version: '2.0.0',
        description: 'Local personal net worth tracking API',
        endpoints: {
            assets: '/api/assets',
            liabilities: '/api/liabilities',
            income: '/api/income',
            expenses: '/api/expenses',
            dashboard: '/api/dashboard',
            snapshots: '/api/snapshots',
            backup: '/api/backup',
            projections: '/api/projections'
        }
    });
});
app.use(notFound_1.notFound);
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});
exports.default = app;
//# sourceMappingURL=index.js.map