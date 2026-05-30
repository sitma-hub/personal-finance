const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { query: mockQuery },
}));

import { TransactionService } from '../TransactionService';

describe('TransactionService.getAll', () => {
  const service = new TransactionService();

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('queries with only the user filter when no filters are given', async () => {
    await service.getAll();
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('FROM transactions');
    expect(params).toEqual(['user@example.com']);
  });

  it('appends conditions and params for each filter', async () => {
    await service.getAll({
      from: '2026-01-01',
      to: '2026-01-31',
      category: 'Food',
      direction: 'outflow',
      account_id: 'acc-1',
    });
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('txn_date >=');
    expect(sql).toContain('txn_date <=');
    expect(sql).toContain('category =');
    expect(sql).toContain('direction =');
    expect(sql).toContain('account_id =');
    expect(params).toEqual([
      'user@example.com',
      '2026-01-01',
      '2026-01-31',
      'Food',
      'outflow',
      'acc-1',
    ]);
  });
});

describe('TransactionService.getMonthlyActualSummary', () => {
  const service = new TransactionService();

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('aggregates inflow and outflow totals from grouped rows', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { category: 'Salary', direction: 'inflow', total: 4000, count: 1 },
        { category: 'Food', direction: 'outflow', total: 600, count: 12 },
        { category: 'Rent', direction: 'outflow', total: 1200, count: 1 },
      ],
    });

    const summary = await service.getMonthlyActualSummary('2026-05');
    expect(summary.month).toBe('2026-05');
    expect(summary.actualInflow).toBe(4000);
    expect(summary.actualOutflow).toBe(1800);
    expect(summary.net).toBe(2200);
    expect(summary.byCategory).toHaveLength(3);
  });
});
