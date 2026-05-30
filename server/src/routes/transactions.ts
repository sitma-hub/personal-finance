import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { TransactionService } from '../services/TransactionService';
import { TransactionDirection, TransactionFilters, TransactionKind } from '../types';

const TRANSACTION_KINDS: TransactionKind[] = [
  'spending',
  'income',
  'investment',
  'debt_payment',
  'transfer',
];

const router = Router();
const transactionService = new TransactionService();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { from, to, category, direction, kind, account_id } = req.query;
  const filters: TransactionFilters = {};
  if (typeof from === 'string') filters.from = from;
  if (typeof to === 'string') filters.to = to;
  if (typeof category === 'string') filters.category = category;
  if (direction === 'inflow' || direction === 'outflow') {
    filters.direction = direction as TransactionDirection;
  }
  if (typeof kind === 'string' && TRANSACTION_KINDS.includes(kind as TransactionKind)) {
    filters.kind = kind as TransactionKind;
  }
  if (typeof account_id === 'string') filters.account_id = account_id;

  const transactions = await transactionService.getAll(filters);
  return res.json({ success: true, data: transactions });
}));

router.get('/categories', asyncHandler(async (_req: Request, res: Response) => {
  const categories = await transactionService.getCategories();
  return res.json({ success: true, data: categories });
}));

router.get('/summary', asyncHandler(async (req: Request, res: Response) => {
  const month = typeof req.query['month'] === 'string' ? req.query['month'] : undefined;
  const summary = await transactionService.getMonthlyActualSummary(month);
  return res.json({ success: true, data: summary });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, error: { message: 'Transaction ID is required' } });
  }
  const transaction = await transactionService.getById(id);
  if (!transaction) {
    return res.status(404).json({ success: false, error: { message: 'Transaction not found' } });
  }
  return res.json({ success: true, data: transaction });
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const transaction = await transactionService.create(req.body);
  return res.status(201).json({ success: true, data: transaction });
}));

router.post('/import', asyncHandler(async (req: Request, res: Response) => {
  const rows = Array.isArray(req.body?.transactions) ? req.body.transactions : null;
  if (!rows) {
    return res.status(400).json({
      success: false,
      error: { message: 'Expected a "transactions" array in the request body' },
    });
  }
  const imported = await transactionService.bulkCreate(rows);
  return res.status(201).json({ success: true, data: { imported } });
}));

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, error: { message: 'Transaction ID is required' } });
  }
  const transaction = await transactionService.update(id, req.body);
  if (!transaction) {
    return res.status(404).json({ success: false, error: { message: 'Transaction not found' } });
  }
  return res.json({ success: true, data: transaction });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, error: { message: 'Transaction ID is required' } });
  }
  const deleted = await transactionService.delete(id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: { message: 'Transaction not found' } });
  }
  return res.json({ success: true, message: 'Transaction deleted successfully' });
}));

export default router;
