import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

import assetRoutes from './routes/assets';
import liabilityRoutes from './routes/liabilities';
import incomeRoutes from './routes/income';
import expenseRoutes from './routes/expenses';
import dashboardRoutes from './routes/dashboard';
import snapshotRoutes from './routes/snapshots';
import backupRoutes from './routes/backup';
import projectionRoutes from './routes/projections';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 5000;

app.use(helmet());
app.use(cors({
  origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  credentials: true
}));
app.use(compression());

if (process.env['NODE_ENV'] === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api/assets', assetRoutes);
app.use('/api/liabilities', liabilityRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/snapshots', snapshotRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/projections', projectionRoutes);

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

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

export default app;
