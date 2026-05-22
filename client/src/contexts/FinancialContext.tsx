import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
    Asset,
    Liability,
    IncomeStream,
    Expense,
    NetWorthSnapshot,
    DashboardSummary,
    AssetAllocation,
    NetWorthTrend,
    NetWorthProjectionsResponse,
    RecentValueUpdate,
    AssetFormData,
    IncomeFormData,
    ExpenseFormData,
} from '../types';
import { assetService } from '../services/assetService';
import { liabilityService } from '../services/liabilityService';
import { incomeService } from '../services/incomeService';
import { expenseService } from '../services/expenseService';
import { dashboardService } from '../services/dashboardService';
import { snapshotService } from '../services/snapshotService';
import { projectionService } from '../services/projectionService';

interface FinancialState {
    assets: Asset[];
    liabilities: Liability[];
    incomeStreams: IncomeStream[];
    expenses: Expense[];
    snapshots: NetWorthSnapshot[];
    summary: DashboardSummary | null;
    allocation: AssetAllocation[];
    netWorthHistory: NetWorthTrend[];
    netWorthProjections: NetWorthProjectionsResponse | null;
    recentUpdates: RecentValueUpdate[];
    loading: boolean;
    error: string | null;
}

type Action =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_DATA'; payload: Partial<FinancialState> };

const initialState: FinancialState = {
    assets: [],
    liabilities: [],
    incomeStreams: [],
    expenses: [],
    snapshots: [],
    summary: null,
    allocation: [],
    netWorthHistory: [],
    netWorthProjections: null,
    recentUpdates: [],
    loading: false,
    error: null,
};

function reducer(state: FinancialState, action: Action): FinancialState {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'SET_DATA':
            return { ...state, ...action.payload };
        default:
            return state;
    }
}

interface FinancialContextValue {
    state: FinancialState;
    refresh: () => Promise<void>;
    createAsset: (data: AssetFormData) => Promise<void>;
    updateAsset: (id: string, data: Partial<AssetFormData>) => Promise<void>;
    deleteAsset: (id: string) => Promise<void>;
    createLiability: (data: Partial<Liability>) => Promise<void>;
    updateLiability: (id: string, data: Partial<Liability>) => Promise<void>;
    deleteLiability: (id: string) => Promise<void>;
    createIncome: (data: IncomeFormData) => Promise<void>;
    updateIncome: (id: string, data: Partial<IncomeFormData>) => Promise<void>;
    deleteIncome: (id: string) => Promise<void>;
    createExpense: (data: ExpenseFormData) => Promise<void>;
    updateExpense: (id: string, data: Partial<ExpenseFormData>) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;
    saveSnapshot: (month?: string, notes?: string) => Promise<void>;
    deleteSnapshot: (id: string) => Promise<void>;
}

const FinancialContext = createContext<FinancialContextValue | null>(null);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState);

    const refresh = useCallback(async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });
        try {
            const [
                assetsRes,
                liabilitiesRes,
                incomeRes,
                expensesRes,
                snapshotsRes,
                summaryRes,
                allocationRes,
                historyRes,
                updatesRes,
                netWorthProjRes,
            ] = await Promise.all([
                assetService.getAllAssets(),
                liabilityService.getAllLiabilities(),
                incomeService.getAllIncomeStreams(),
                expenseService.getAllExpenses(),
                snapshotService.getAll(),
                dashboardService.getDashboardSummary(),
                dashboardService.getAssetAllocation(),
                dashboardService.getNetWorthHistory(),
                dashboardService.getRecentUpdates(),
                projectionService.getNetWorthProjections(10),
            ]);

            dispatch({
                type: 'SET_DATA',
                payload: {
                    assets: assetsRes.data || [],
                    liabilities: liabilitiesRes.data || [],
                    incomeStreams: incomeRes.data || [],
                    expenses: expensesRes.data || [],
                    snapshots: snapshotsRes.data || [],
                    summary: summaryRes.data || null,
                    allocation: allocationRes.data || [],
                    netWorthHistory: historyRes.data || [],
                    netWorthProjections: netWorthProjRes.data || null,
                    recentUpdates: updatesRes.data || [],
                },
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load financial data';
            dispatch({ type: 'SET_ERROR', payload: message });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const wrapMutation = async (fn: () => Promise<void>) => {
        dispatch({ type: 'SET_ERROR', payload: null });
        try {
            await fn();
            await refresh();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Operation failed';
            dispatch({ type: 'SET_ERROR', payload: message });
            throw err;
        }
    };

    const value: FinancialContextValue = {
        state,
        refresh,
        createAsset: (data) => wrapMutation(async () => { await assetService.createAsset(data); }),
        updateAsset: (id, data) => wrapMutation(async () => { await assetService.updateAsset(id, data); }),
        deleteAsset: (id) => wrapMutation(async () => { await assetService.deleteAsset(id); }),
        createLiability: (data) => wrapMutation(async () => { await liabilityService.createLiability(data); }),
        updateLiability: (id, data) => wrapMutation(async () => { await liabilityService.updateLiability(id, data); }),
        deleteLiability: (id) => wrapMutation(async () => { await liabilityService.deleteLiability(id); }),
        createIncome: (data) => wrapMutation(async () => { await incomeService.createIncomeStream(data); }),
        updateIncome: (id, data) => wrapMutation(async () => { await incomeService.updateIncomeStream(id, data); }),
        deleteIncome: (id) => wrapMutation(async () => { await incomeService.deleteIncomeStream(id); }),
        createExpense: (data) => wrapMutation(async () => { await expenseService.createExpense(data); }),
        updateExpense: (id, data) => wrapMutation(async () => { await expenseService.updateExpense(id, data); }),
        deleteExpense: (id) => wrapMutation(async () => { await expenseService.deleteExpense(id); }),
        saveSnapshot: (month, notes) => wrapMutation(async () => { await snapshotService.create(month, notes); }),
        deleteSnapshot: (id) => wrapMutation(async () => { await snapshotService.delete(id); }),
    };

    return (
        <FinancialContext.Provider value={value}>
            {children}
        </FinancialContext.Provider>
    );
};

export const useFinancial = (): FinancialContextValue => {
    const ctx = useContext(FinancialContext);
    if (!ctx) throw new Error('useFinancial must be used within FinancialProvider');
    return ctx;
};
