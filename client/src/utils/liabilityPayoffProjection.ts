import { Liability } from '../types';
import { addMonths, currentMonth, monthsBetween, normalizeMonth } from './dateInput';

/** Annual interest rate as decimal (e.g. 0.035). UI percent (3.5) vs decimal (<=0.25). */
export function getLiabilityAnnualRateDecimal(interestRate?: number | string | null): number {
    const r = parseFloat(String(interestRate ?? 0));
    if (!r || r <= 0) return 0;
    if (r <= 0.25) return r;
    return r / 100;
}

export function getLiabilityMonthlyRate(interestRate?: number | string | null): number {
    return getLiabilityAnnualRateDecimal(interestRate) / 12;
}

export type PayoffScenarioKind = 'baseline' | 'saved' | 'extra_monthly' | 'lump_sum';

export interface PayoffScenario {
    id: string;
    kind: PayoffScenarioKind;
    label: string;
    extraMonthlyPayment?: number;
    lumpSumAmount?: number;
    includeSavedSpecialRepayments?: boolean;
}

export interface PayoffSchedulePoint {
    month: string;
    monthIndex: number;
    balance: number;
    interestPaid: number;
    principalPaid: number;
    cumulativeInterest: number;
}

export interface PayoffScheduleResult {
    points: PayoffSchedulePoint[];
    payoffMonthIndex: number | null;
    payoffMonth: string | null;
    totalInterest: number;
    monthsToPayoff: number | null;
    startingBalance: number;
    doesNotAmortize: boolean;
}

export type PayoffChartRow = {
    month: string;
    [scenarioId: string]: number | string | null;
};

const MAX_PAYOFF_MONTHS = 600;
const ROUND = (n: number) => Math.round(n * 100) / 100;

export const BASELINE_SCENARIO_ID = 'baseline';
export const SAVED_SCENARIO_ID = 'saved';
export const EXTRA_MONTHLY_SCENARIO_ID = 'extra_monthly';
export const LUMP_SUM_SCENARIO_ID = 'lump_sum';

export function createBaselineScenario(): PayoffScenario {
    return {
        id: BASELINE_SCENARIO_ID,
        kind: 'baseline',
        label: 'Baseline (regular payment only)',
        includeSavedSpecialRepayments: false,
    };
}

export function createSavedScenario(): PayoffScenario {
    return {
        id: SAVED_SCENARIO_ID,
        kind: 'saved',
        label: 'Current plan',
        includeSavedSpecialRepayments: true,
    };
}

/** Whether scheduled special repayments from the saved liability are included. */
export function scenarioIncludesSavedSpecialRepayments(scenario: PayoffScenario): boolean {
    if (scenario.kind === 'baseline') return false;
    if (scenario.kind === 'saved') return true;
    return scenario.includeSavedSpecialRepayments ?? false;
}

export function createExtraMonthlyScenario(
    amount: number,
    includeCurrentPlanSpecialRepayments: boolean
): PayoffScenario {
    const base = includeCurrentPlanSpecialRepayments
        ? createSavedScenario()
        : createBaselineScenario();
    return {
        ...base,
        id: EXTRA_MONTHLY_SCENARIO_ID,
        kind: 'extra_monthly',
        label: includeCurrentPlanSpecialRepayments
            ? `Current plan + €${amount}/month extra`
            : `Baseline + €${amount}/month extra`,
        extraMonthlyPayment: amount,
        includeSavedSpecialRepayments: includeCurrentPlanSpecialRepayments,
    };
}

export function createLumpSumScenario(
    amount: number,
    includeCurrentPlanSpecialRepayments: boolean
): PayoffScenario {
    const base = includeCurrentPlanSpecialRepayments
        ? createSavedScenario()
        : createBaselineScenario();
    return {
        ...base,
        id: LUMP_SUM_SCENARIO_ID,
        kind: 'lump_sum',
        label: includeCurrentPlanSpecialRepayments
            ? `Current plan + €${amount} lump sum today`
            : `Baseline + €${amount} lump sum today`,
        lumpSumAmount: amount,
        includeSavedSpecialRepayments: includeCurrentPlanSpecialRepayments,
    };
}

function getRegularMonthlyPayment(liability: Liability, balance: number, monthlyRate: number): number {
    const monthlyPayment = Number(liability.monthly_payment || 0);
    const minimumPayment = Number(liability.minimum_payment || 0);
    let payment = monthlyPayment || minimumPayment;
    if (!payment || payment <= 0) {
        const interest = balance * monthlyRate;
        payment = interest + Math.max(balance * 0.01, 10);
    }
    return payment;
}

function getSpecialRepaymentLump(liability: Liability, monthIndex: number): number {
    if (!liability.special_repayment_enabled || !liability.special_repayment_amount) {
        return 0;
    }
    const amount = Number(liability.special_repayment_amount);
    switch (liability.special_repayment_frequency) {
        case 'quarterly':
            return monthIndex % 3 === 0 ? amount : 0;
        case 'annual':
            return monthIndex % 12 === 0 ? amount : 0;
        case 'monthly':
        default:
            return amount;
    }
}

function calendarYearForPayoffMonth(monthIndex: number): number {
    const month = addMonths(currentMonth(), monthIndex);
    return Number(month.split('-')[0]);
}

function applyPrepaymentPrincipal(
    liability: Liability,
    requestedPrincipal: number,
    balance: number,
    originalBalance: number,
    yearPrepaid: Map<number, number>,
    calendarYear: number
): number {
    if (requestedPrincipal <= 0 || balance <= 0) return 0;

    let effective = Math.min(requestedPrincipal, balance);
    const maxPct = Number(liability.max_annual_prepayment_percentage || 0);
    if (maxPct > 0) {
        const maxAnnual = originalBalance * (maxPct / 100);
        const used = yearPrepaid.get(calendarYear) ?? 0;
        const remaining = Math.max(0, maxAnnual - used);
        effective = Math.min(effective, remaining);
    }

    if (liability.prepayment_penalty && liability.prepayment_penalty_rate) {
        const penaltyRate = Number(liability.prepayment_penalty_rate) / 100;
        effective = effective * (1 - penaltyRate);
    }

    effective = Math.min(effective, balance);
    yearPrepaid.set(calendarYear, (yearPrepaid.get(calendarYear) ?? 0) + effective);
    return effective;
}

function simulateOneMonth(
    liability: Liability,
    balance: number,
    monthIndex: number,
    scenario: PayoffScenario,
    originalBalance: number,
    yearPrepaid: Map<number, number>
): { balance: number; interestPaid: number; principalPaid: number } {
    if (balance <= 0) {
        return { balance: 0, interestPaid: 0, principalPaid: 0 };
    }

    const monthlyRate = getLiabilityMonthlyRate(liability.interest_rate);
    const calendarYear = calendarYearForPayoffMonth(monthIndex);
    let principalPaid = 0;
    let interestPaid = 0;

    if (monthIndex === 0 && scenario.lumpSumAmount && scenario.lumpSumAmount > 0) {
        const lumpPrincipal = applyPrepaymentPrincipal(
            liability,
            scenario.lumpSumAmount,
            balance,
            originalBalance,
            yearPrepaid,
            calendarYear
        );
        balance = Math.max(0, balance - lumpPrincipal);
        principalPaid += lumpPrincipal;
    }

    if (balance <= 0) {
        return { balance: 0, interestPaid, principalPaid };
    }

    const interest = balance * monthlyRate;
    interestPaid = interest;
    const extraMonthly = Number(scenario.extraMonthlyPayment || 0);
    const regularPayment =
        getRegularMonthlyPayment(liability, balance, monthlyRate) + extraMonthly;
    const regularPrincipal = Math.max(0, Math.min(balance, regularPayment - interest));
    balance = Math.max(0, balance - regularPrincipal);
    principalPaid += regularPrincipal;

    const includeSpecial = scenarioIncludesSavedSpecialRepayments(scenario);
    const specialLump = includeSpecial ? getSpecialRepaymentLump(liability, monthIndex) : 0;
    const prepaymentRequest = specialLump;

    if (prepaymentRequest > 0 && balance > 0) {
        const prepPrincipal = applyPrepaymentPrincipal(
            liability,
            prepaymentRequest,
            balance,
            originalBalance,
            yearPrepaid,
            calendarYear
        );
        balance = Math.max(0, balance - prepPrincipal);
        principalPaid += prepPrincipal;
    }

    return { balance: ROUND(balance), interestPaid: ROUND(interestPaid), principalPaid: ROUND(principalPaid) };
}

/** Roll stored balance forward from as_of_month to the current calendar month (saved plan). */
export function resolveLiabilityStartingBalance(liability: Liability, referenceMonth = currentMonth()): number {
    const balance = Number(liability.current_balance) || 0;
    if (balance <= 0) return 0;

    if (!liability.as_of_month) {
        return ROUND(balance);
    }

    const asOf = normalizeMonth(liability.as_of_month);
    const months = monthsBetween(asOf, referenceMonth);
    if (months <= 0) {
        return ROUND(balance);
    }

    const result = buildPayoffSchedule(liability, createSavedScenario(), months, balance, asOf);
    const last = result.points[result.points.length - 1];
    return last?.balance ?? ROUND(balance);
}

/** Months from as_of snapshot through reference month (for table projections). */
export function monthsFromAsOfTo(liability: Liability, referenceMonth = currentMonth()): number {
    if (!liability.as_of_month) return 0;
    return Math.max(0, monthsBetween(normalizeMonth(liability.as_of_month), referenceMonth));
}

/** Project balance after N months from the stored as_of balance (saved plan). */
export function projectLiabilityBalanceAtMonths(
    liability: Liability,
    totalMonthsFromAsOf: number,
    includeSpecial = true
): number {
    const start = Number(liability.current_balance) || 0;
    if (start <= 0 || totalMonthsFromAsOf <= 0) {
        return totalMonthsFromAsOf <= 0 ? ROUND(start) : ROUND(start);
    }

    const scenario: PayoffScenario = includeSpecial
        ? createSavedScenario()
        : createBaselineScenario();
    const baseMonth = liability.as_of_month ? normalizeMonth(liability.as_of_month) : currentMonth();
    const result = buildPayoffSchedule(liability, scenario, totalMonthsFromAsOf, start, baseMonth);
    const last = result.points[result.points.length - 1];
    return last?.balance ?? ROUND(start);
}

export function buildPayoffSchedule(
    liability: Liability,
    scenario: PayoffScenario,
    maxMonths: number = MAX_PAYOFF_MONTHS,
    startingBalance?: number,
    startMonthLabel?: string
): PayoffScheduleResult {
    const startBalance = startingBalance ?? resolveLiabilityStartingBalance(liability);
    const originalBalance = Number(liability.current_balance) || startBalance;
    const monthlyRate = getLiabilityMonthlyRate(liability.interest_rate);
    const regularOnly = getRegularMonthlyPayment(liability, startBalance, monthlyRate);
    const doesNotAmortize =
        startBalance > 0 && monthlyRate > 0 && regularOnly <= startBalance * monthlyRate;

    const baseMonth = startMonthLabel ?? currentMonth();
    const points: PayoffSchedulePoint[] = [];
    let balance = startBalance;
    let cumulativeInterest = 0;
    let payoffMonthIndex: number | null = null;
    let payoffMonth: string | null = null;
    const yearPrepaid = new Map<number, number>();

    points.push({
        month: baseMonth,
        monthIndex: 0,
        balance: ROUND(balance),
        interestPaid: 0,
        principalPaid: 0,
        cumulativeInterest: 0,
    });

    if (startBalance <= 0) {
        return {
            points,
            payoffMonthIndex: 0,
            payoffMonth: baseMonth,
            totalInterest: 0,
            monthsToPayoff: 0,
            startingBalance: 0,
            doesNotAmortize: false,
        };
    }

    for (let m = 0; m < maxMonths; m++) {
        const step = simulateOneMonth(liability, balance, m, scenario, originalBalance, yearPrepaid);
        balance = step.balance;
        cumulativeInterest += step.interestPaid;

        const monthLabel = addMonths(baseMonth, m + 1);
        points.push({
            month: monthLabel,
            monthIndex: m + 1,
            balance: ROUND(balance),
            interestPaid: step.interestPaid,
            principalPaid: step.principalPaid,
            cumulativeInterest: ROUND(cumulativeInterest),
        });

        if (payoffMonthIndex == null && balance <= 0) {
            payoffMonthIndex = m;
            payoffMonth = monthLabel;
        }

        if (balance <= 0) break;
    }

    return {
        points,
        payoffMonthIndex,
        payoffMonth,
        totalInterest: ROUND(cumulativeInterest),
        monthsToPayoff: payoffMonthIndex != null ? payoffMonthIndex + 1 : null,
        startingBalance: ROUND(startBalance),
        doesNotAmortize,
    };
}

export function buildPayoffChartRows(
    liability: Liability,
    scenarios: PayoffScenario[]
): PayoffChartRow[] {
    if (scenarios.length === 0) return [];

    const schedules = scenarios.map((s) => ({
        scenario: s,
        result: buildPayoffSchedule(liability, s),
    }));

    let maxLen = 0;
    schedules.forEach(({ result }) => {
        maxLen = Math.max(maxLen, result.points.length);
    });

    const rows: PayoffChartRow[] = [];
    for (let i = 0; i < maxLen; i++) {
        const month = schedules.find(({ result }) => result.points[i])?.result.points[i]?.month ?? '';
        const row: PayoffChartRow = { month };
        schedules.forEach(({ scenario, result }) => {
            const pt = result.points[i];
            row[scenario.id] = pt != null ? pt.balance : null;
        });
        rows.push(row);
    }

    return rows;
}

export function comparePayoffSchedules(
    reference: PayoffScheduleResult,
    other: PayoffScheduleResult
): { monthsSaved: number | null; interestSaved: number | null } {
    if (reference.monthsToPayoff == null || other.monthsToPayoff == null) {
        return { monthsSaved: null, interestSaved: null };
    }
    return {
        monthsSaved: reference.monthsToPayoff - other.monthsToPayoff,
        interestSaved: ROUND(reference.totalInterest - other.totalInterest),
    };
}

/** @deprecated Use comparePayoffSchedules */
export const compareToBaseline = comparePayoffSchedules;
