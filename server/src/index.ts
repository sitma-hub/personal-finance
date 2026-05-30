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
import transactionRoutes from './routes/transactions';
import dashboardRoutes from './routes/dashboard';
import insightRoutes from './routes/insights';
import snapshotRoutes from './routes/snapshots';
import checkInRoutes from './routes/checkIn';
import backupRoutes from './routes/backup';
import projectionRoutes from './routes/projections';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { runMigrations } from './database/migrate';

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
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/snapshots', snapshotRoutes);
app.use('/api/check-in', checkInRoutes);
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
      transactions: '/api/transactions',
      dashboard: '/api/dashboard',
      insights: '/api/insights',
      snapshots: '/api/snapshots',
      checkIn: '/api/check-in',
      backup: '/api/backup',
      projections: '/api/projections'
    }
  });
});

app.use(notFound);
app.use(errorHandler);

async function migrateWithRetry(maxAttempts = 10, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await runMigrations();
      return;
    } catch (err) {
      if (attempt === maxAttempts) {
        throw err;
      }
      console.warn(
        `⏳ Migration attempt ${attempt}/${maxAttempts} failed (database may not be ready yet). Retrying in ${delayMs}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function start(): Promise<void> {
  try {
    await migrateWithRetry();
  } catch (err) {
    console.error('❌ Could not run database migrations; aborting startup.', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
  });
}

void start();

export default app;
