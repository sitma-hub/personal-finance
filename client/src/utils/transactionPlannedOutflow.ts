import type { Liability, Transaction } from '../types';
import {
    getLiabilityBaseMonthlyPayment,
    getLiabilitySpecialRepaymentMonthly,
} from './liabilityCashFlow';

export type DebtPlannedComponent = 'regular' | 'special';

export type PlannedOutflowOption = {
    value: string;
    group: 'expense' | 'debt';
    label: string;
    sublabel?: string;
};

const EXPENSE_PREFIX = 'expense:';
const DEBT_PREFIX = 'debt:';

export function encodePlannedOutflow(txn: Pick<Transaction, 'expense_id' | 'liability_id' | 'debt_planned_component'>): string {
    if (txn.debt_planned_component && txn.liability_id) {
        return `${DEBT_PREFIX}${txn.liability_id}:${txn.debt_planned_component}`;
    }
    if (txn.expense_id) {
        return `${EXPENSE_PREFIX}${txn.expense_id}`;
    }
    return '';
}

export function decodePlannedOutflow(value: string): {
    expense_id: string | null;
    debt_planned_component: DebtPlannedComponent | null;
    liability_id: string | null;
} {
    if (!value) {
        return { expense_id: null, debt_planned_component: null, liability_id: null };
    }
    if (value.startsWith(EXPENSE_PREFIX)) {
        return {
            expense_id: value.slice(EXPENSE_PREFIX.length) || null,
            debt_planned_component: null,
            liability_id: null,
        };
    }
    if (value.startsWith(DEBT_PREFIX)) {
        const rest = value.slice(DEBT_PREFIX.length);
        const [liabilityId, component] = rest.split(':');
        if (liabilityId && (component === 'regular' || component === 'special')) {
            return {
                expense_id: null,
                debt_planned_component: component,
                liability_id: liabilityId,
            };
        }
    }
    return { expense_id: null, debt_planned_component: null, liability_id: null };
}

export function buildPlannedOutflowOptions(
    liabilities: Liability[],
    expenses: { id: string; name: string; category: string }[],
    opts: {
        includeExpenses: boolean;
        includeDebt: boolean;
        liabilityId?: string;
        labels: {
            debtRegular: (name: string, amount: string) => string;
            debtSpecial: (name: string, amount: string, frequency: string) => string;
        };
        formatCurrency: (n: number) => string;
    }
): PlannedOutflowOption[] {
    const out: PlannedOutflowOption[] = [];

    if (opts.includeExpenses) {
        for (const e of expenses) {
            out.push({
                value: `${EXPENSE_PREFIX}${e.id}`,
                group: 'expense',
                label: e.name,
                sublabel: e.category,
            });
        }
    }

    if (opts.includeDebt) {
        const list = opts.liabilityId
            ? liabilities.filter((l) => l.id === opts.liabilityId)
            : liabilities;

        for (const l of list) {
            const regular = getLiabilityBaseMonthlyPayment(l);
            if (regular > 0) {
                out.push({
                    value: `${DEBT_PREFIX}${l.id}:regular`,
                    group: 'debt',
                    label: opts.labels.debtRegular(l.name, opts.formatCurrency(regular)),
                });
            }
            if (l.special_repayment_enabled && l.special_repayment_amount) {
                const monthlyEq = getLiabilitySpecialRepaymentMonthly(l);
                out.push({
                    value: `${DEBT_PREFIX}${l.id}:special`,
                    group: 'debt',
                    label: opts.labels.debtSpecial(
                        l.name,
                        opts.formatCurrency(Number(l.special_repayment_amount)),
                        l.special_repayment_frequency ?? 'monthly'
                    ),
                    sublabel: monthlyEq > 0 ? `≈ ${opts.formatCurrency(monthlyEq)}/mo` : undefined,
                });
            }
        }
    }

    return out;
}
