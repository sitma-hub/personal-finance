import {
  CategorySpendItem,
  Liability,
  Transaction,
  TransactionKind,
} from '../types';
import { getLiabilityAnnualRateDecimal } from './liabilityCashFlow';

export interface MonthlyActualTotals {
  actualInflow: number;
  actualOutflow: number;
  actualIncome: number;
  actualSpending: number;
  actualSavingsInvestments: number;
  debtInterest: number;
  debtPrincipal: number;
  net: number;
  byCategory: CategorySpendItem[];
}

function num(value: unknown): number {
  return parseFloat(String(value ?? 0)) || 0;
}

/** Estimated monthly interest on a liability's current balance. */
export function estimateMonthlyInterest(liability: Liability): number {
  const balance = num(liability.current_balance);
  if (balance <= 0) return 0;
  const annualRate = getLiabilityAnnualRateDecimal(liability.interest_rate);
  return balance * (annualRate / 12);
}

/**
 * Estimate interest vs principal split for UI hints only.
 * Actual-vs-planned spending uses the full payment amount (planned debt includes interest).
 */
export function splitDebtPayment(
  amount: number,
  liability: Liability | null | undefined
): { interest: number; principal: number } {
  if (amount <= 0) return { interest: 0, principal: 0 };
  if (!liability) return { interest: amount, principal: 0 };
  const interest = Math.min(amount, estimateMonthlyInterest(liability));
  return { interest, principal: Math.max(0, amount - interest) };
}

export function defaultKindForDirection(direction: 'inflow' | 'outflow'): TransactionKind {
  return direction === 'inflow' ? 'income' : 'spending';
}

export function normalizeTransactionKind(
  kind: TransactionKind | undefined,
  direction: 'inflow' | 'outflow'
): TransactionKind {
  if (!kind) return defaultKindForDirection(direction);
  if (direction === 'inflow' && kind !== 'income' && kind !== 'transfer') {
    return 'income';
  }
  if (direction === 'outflow' && kind === 'income') {
    return 'spending';
  }
  return kind;
}

type CategoryKey = string;

function categoryKey(category: string, direction: string): CategoryKey {
  return `${category}\0${direction}`;
}

/**
 * Aggregate transactions for a month using explicit `kind` (no keyword guessing).
 */
export function summarizeMonthlyActuals(
  rows: Pick<
    Transaction,
    'amount' | 'direction' | 'kind' | 'category' | 'liability_id'
  >[],
  liabilitiesById: Map<string, Liability>
): MonthlyActualTotals {
  let actualInflow = 0;
  let actualOutflow = 0;
  let actualIncome = 0;
  let actualSpending = 0;
  let actualSavingsInvestments = 0;
  let debtInterest = 0;
  let debtPrincipal = 0;

  const categoryTotals = new Map<CategoryKey, CategorySpendItem>();

  for (const row of rows) {
    const amount = num(row.amount);
    if (amount <= 0) continue;

    const kind = normalizeTransactionKind(row.kind, row.direction);
    const direction = row.direction;

    if (direction === 'inflow') {
      actualInflow += amount;
      if (kind === 'income') actualIncome += amount;
    } else {
      actualOutflow += amount;

      switch (kind) {
        case 'spending':
          actualSpending += amount;
          break;
        case 'investment':
          actualSavingsInvestments += amount;
          break;
        case 'debt_payment': {
          const liability = row.liability_id
            ? liabilitiesById.get(row.liability_id)
            : undefined;
          const { interest, principal } = splitDebtPayment(amount, liability);
          debtInterest += interest;
          debtPrincipal += principal;
          actualSpending += amount;
          break;
        }
        case 'transfer':
          break;
        case 'income':
          break;
        default:
          actualSpending += amount;
      }
    }

    const key = categoryKey(row.category || 'Uncategorized', direction);
    const existing = categoryTotals.get(key);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
    } else {
      categoryTotals.set(key, {
        category: row.category || 'Uncategorized',
        direction,
        total: amount,
        count: 1,
      });
    }
  }

  const byCategory = Array.from(categoryTotals.values()).sort((a, b) => b.total - a.total);

  return {
    actualInflow,
    actualOutflow,
    actualIncome,
    actualSpending,
    actualSavingsInvestments,
    debtInterest,
    debtPrincipal,
    net: actualInflow - actualOutflow,
    byCategory,
  };
}
