import {
  summarizeMonthlyActuals,
  splitDebtPayment,
  normalizeTransactionKind,
} from '../transactionActuals';
import { Liability, Transaction } from '../../types';

const liability = (overrides: Partial<Liability> = {}): Liability =>
  ({
    id: 'l1',
    user_id: 'u',
    name: 'Mortgage',
    type: 'mortgage',
    current_balance: 240000,
    interest_rate: 3.6,
    monthly_payment: 2000,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }) as Liability;

const txn = (
  overrides: Partial<Transaction> & Pick<Transaction, 'amount' | 'direction'>
): Transaction =>
  ({
    id: 't1',
    user_id: 'u',
    txn_date: '2026-05-01',
    category: 'Test',
    kind: 'spending',
    source: 'manual',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }) as Transaction;

describe('splitDebtPayment', () => {
  it('splits payment into interest and principal from linked liability', () => {
    const { interest, principal } = splitDebtPayment(2000, liability());
    expect(interest).toBeCloseTo(720, 0);
    expect(principal).toBeCloseTo(1280, 0);
  });

  it('treats full amount as interest when liability is not linked', () => {
    const { interest, principal } = splitDebtPayment(2000, null);
    expect(interest).toBe(2000);
    expect(principal).toBe(0);
  });
});

describe('summarizeMonthlyActuals', () => {
  const liabilities = new Map([['l1', liability()]]);

  it('counts spending and investment separately by kind', () => {
    const totals = summarizeMonthlyActuals(
      [
        txn({ amount: 500, direction: 'outflow', kind: 'spending', category: 'Food' }),
        txn({ amount: 1500, direction: 'outflow', kind: 'investment', category: 'ETF' }),
        txn({ amount: 4000, direction: 'inflow', kind: 'income', category: 'Salary' }),
      ],
      new Map()
    );
    expect(totals.actualSpending).toBe(500);
    expect(totals.actualSavingsInvestments).toBe(1500);
    expect(totals.actualIncome).toBe(4000);
  });

  it('counts full debt_payment as spending (matches planned debt totals)', () => {
    const totals = summarizeMonthlyActuals(
      [
        txn({
          amount: 2000,
          direction: 'outflow',
          kind: 'debt_payment',
          liability_id: 'l1',
          category: 'Mortgage',
        }),
      ],
      liabilities
    );
    expect(totals.debtInterest).toBeCloseTo(720, 0);
    expect(totals.debtPrincipal).toBeCloseTo(1280, 0);
    expect(totals.actualSpending).toBeCloseTo(2000, 0);
    expect(totals.actualSavingsInvestments).toBe(0);
  });

  it('ignores transfers in spending and wealth-building totals', () => {
    const totals = summarizeMonthlyActuals(
      [txn({ amount: 300, direction: 'outflow', kind: 'transfer', category: 'Transfer' })],
      new Map()
    );
    expect(totals.actualSpending).toBe(0);
    expect(totals.actualSavingsInvestments).toBe(0);
    expect(totals.actualOutflow).toBe(300);
  });
});

describe('normalizeTransactionKind', () => {
  it('defaults inflow without kind to income', () => {
    expect(normalizeTransactionKind(undefined, 'inflow')).toBe('income');
  });
});
