import { Asset, Expense, IncomeStream, Liability, INVESTABLE_ASSET_TYPES } from '../types';
import { getLiabilityMonthlyPayment } from './liabilityCashFlow';
import { incomeStreamToMonthly } from './monthlyAmounts';

export const HUB_NODE_ID = 'monthly_income_hub';

export type SankeyNodeKind =
    | 'income'
    | 'hub'
    | 'expense'
    | 'debt'
    | 'investing'
    | 'surplus'
    | 'shortfall';

export interface CashFlowSankeyNode {
    id: string;
    label: string;
    kind: SankeyNodeKind;
}

export interface CashFlowSankeyLink {
    source: string;
    target: string;
    value: number;
}

export interface CashFlowSankeyData {
    nodes: CashFlowSankeyNode[];
    links: CashFlowSankeyLink[];
    meta: {
        monthlyIncome: number;
        monthlyOutflow: number;
        monthlySavings: number;
        isDeficit: boolean;
        groupedCount: number;
        hasRenderableFlow: boolean;
    };
}

const DEFAULT_MAX_LEAF_NODES = 28;

export interface BuildCashFlowSankeyOptions {
    maxLeafNodes?: number;
}

type LeafItem = { id: string; label: string; value: number };

const ROUND = (n: number) => Math.round(n * 100) / 100;

function slugId(prefix: string, label: string): string {
    return `${prefix}_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
}

function groupTopItems(
    items: LeafItem[],
    maxVisible: number,
    otherId: string,
    otherLabel: string
): { leaves: LeafItem[]; groupedCount: number } {
    const positive = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
    if (positive.length <= maxVisible) {
        return { leaves: positive, groupedCount: 0 };
    }
    const visible = positive.slice(0, maxVisible - 1);
    const rest = positive.slice(maxVisible - 1);
    const otherValue = rest.reduce((sum, i) => sum + i.value, 0);
    return {
        leaves: [...visible, { id: otherId, label: otherLabel, value: ROUND(otherValue) }],
        groupedCount: rest.length,
    };
}

function plannedMonthlyInvesting(assets: Asset[]): number {
    return assets
        .filter(
            (a) =>
                INVESTABLE_ASSET_TYPES.includes(a.type) && a.include_in_projection !== false
        )
        .reduce((sum, a) => sum + Number(a.monthly_contribution ?? 0), 0);
}

export function buildCashFlowSankeyData(
    incomeStreams: IncomeStream[],
    expenses: Expense[],
    liabilities: Liability[],
    assets: Asset[],
    options?: BuildCashFlowSankeyOptions
): CashFlowSankeyData {
    const maxLeafNodes = options?.maxLeafNodes ?? DEFAULT_MAX_LEAF_NODES;
    const maxIncomeLeaves = Math.max(6, Math.floor(maxLeafNodes / 2));
    const maxExpenseLeaves = Math.max(6, Math.floor(maxLeafNodes / 2));

    let groupedCount = 0;

    const incomeItems: LeafItem[] = incomeStreams
        .map((stream) => ({
            id: slugId('income', stream.id),
            label: stream.name,
            value: ROUND(incomeStreamToMonthly(stream)),
        }))
        .filter((i) => i.value > 0);

    const { leaves: incomeLeaves, groupedCount: incomeGrouped } = groupTopItems(
        incomeItems,
        maxIncomeLeaves,
        'other_income',
        'Other income'
    );
    groupedCount += incomeGrouped;

    const categoryMap = expenses.reduce((acc, expense) => {
        const cat = expense.category?.trim() || 'Uncategorized';
        acc[cat] = (acc[cat] || 0) + Number(expense.monthly_amount);
        return acc;
    }, {} as Record<string, number>);

    const expenseItems: LeafItem[] = Object.entries(categoryMap).map(([category, value]) => ({
        id: slugId('expense', category),
        label: category,
        value: ROUND(value),
    }));

    const { leaves: expenseLeaves, groupedCount: expenseGrouped } = groupTopItems(
        expenseItems,
        maxExpenseLeaves,
        'other_expenses',
        'Other expenses'
    );
    groupedCount += expenseGrouped;

    const debtRows = liabilities
        .map((l) => ({
            id: slugId('debt', l.id),
            label: l.name,
            value: ROUND(getLiabilityMonthlyPayment(l)),
        }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value);

    const debtLeaves: LeafItem[] = debtRows;

    const investing = ROUND(plannedMonthlyInvesting(assets));

    const livingOutflow = expenseLeaves.reduce((sum, e) => sum + e.value, 0);
    const debtOutflow = debtLeaves.reduce((sum, d) => sum + d.value, 0);
    const monthlyOutflow = ROUND(livingOutflow + debtOutflow + investing);

    const incomeFromStreams = incomeLeaves.reduce((sum, i) => sum + i.value, 0);
    const monthlySavings = ROUND(incomeFromStreams - monthlyOutflow);
    const isDeficit = monthlySavings < 0;

    const shortfallAmount = isDeficit ? ROUND(Math.abs(monthlySavings)) : 0;
    const totalInflow = ROUND(incomeFromStreams + shortfallAmount);

    let surplus = ROUND(totalInflow - monthlyOutflow);
    if (surplus < 0) surplus = 0;

    const nodes: CashFlowSankeyNode[] = [];
    const links: CashFlowSankeyLink[] = [];

    if (shortfallAmount > 0) {
        nodes.push({
            id: 'shortfall',
            label: 'Shortfall (drawdown)',
            kind: 'shortfall',
        });
        links.push({ source: 'shortfall', target: HUB_NODE_ID, value: shortfallAmount });
    }

    incomeLeaves.forEach((item) => {
        nodes.push({ id: item.id, label: item.label, kind: 'income' });
        links.push({ source: item.id, target: HUB_NODE_ID, value: item.value });
    });

    nodes.push({ id: HUB_NODE_ID, label: 'Monthly income', kind: 'hub' });

    expenseLeaves.forEach((item) => {
        nodes.push({ id: item.id, label: item.label, kind: 'expense' });
        links.push({ source: HUB_NODE_ID, target: item.id, value: item.value });
    });

    debtLeaves.forEach((item) => {
        nodes.push({ id: item.id, label: item.label, kind: 'debt' });
        links.push({ source: HUB_NODE_ID, target: item.id, value: item.value });
    });

    if (investing > 0) {
        nodes.push({ id: 'planned_investing', label: 'Planned investing', kind: 'investing' });
        links.push({ source: HUB_NODE_ID, target: 'planned_investing', value: investing });
    }

    if (surplus > 0) {
        nodes.push({ id: 'unallocated_surplus', label: 'Unallocated surplus', kind: 'surplus' });
        links.push({ source: HUB_NODE_ID, target: 'unallocated_surplus', value: surplus });
    }

    const hasRenderableFlow =
        incomeLeaves.length > 0 || shortfallAmount > 0 || monthlyOutflow > 0 || surplus > 0;

    return {
        nodes,
        links,
        meta: {
            monthlyIncome: incomeFromStreams,
            monthlyOutflow,
            monthlySavings,
            isDeficit,
            groupedCount,
            hasRenderableFlow,
        },
    };
}
