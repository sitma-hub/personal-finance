import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Import routes
import assetRoutes from './routes/assets';
import liabilityRoutes from './routes/liabilities';
import incomeRoutes from './routes/income';
import expenseRoutes from './routes/expenses';
import scenarioRoutes from './routes/scenarios';
import goalRoutes from './routes/goals';
import importRoutes from './routes/import';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env['NODE_ENV'] === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API routes
app.use('/api/assets', assetRoutes);
app.use('/api/liabilities', liabilityRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/import', importRoutes);

// API info endpoint
app.get('/api', (_req, res) => {
    res.json({
        name: 'Personal Finance Scenario Modeler API',
        version: '1.0.0',
        description: 'Backend API for personal finance scenario modeling and analysis',
        endpoints: {
            assets: '/api/assets',
            liabilities: '/api/liabilities',
            income: '/api/income',
            expenses: '/api/expenses',
            scenarios: '/api/scenarios',
            goals: '/api/goals',
            import: '/api/import'
        }
    });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
    console.log(`🏥 Health check at http://localhost:${PORT}/health`);
});

export default app;
