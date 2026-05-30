import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
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
    CheckInStatus,
    CheckInProposal,
    ApplyCheckInRequest,
} from '../types';
import { assetService } from '../services/assetService';
import { liabilityService } from '../services/liabilityService';
import { incomeService } from '../services/incomeService';
import { expenseService } from '../services/expenseService';
import { dashboardService } from '../services/dashboardService';
import { snapshotService } from '../services/snapshotService';
import { checkInService } from '../services/checkInService';
import { projectionService } from '../services/projectionService';
import { queryKeys } from '../lib/queryClient';
import {
    buildAssetAllocation,
    buildDashboardSummary,
    buildNetWorthHistory,
} from '../utils/dashboardDerived';

const PROJECTION_YEARS = 10;

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
    projectionsLoading: boolean;
    error: string | null;
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
    getCheckInStatus: () => Promise<CheckInStatus>;
    getCheckInProposal: (month: string) => Promise<CheckInProposal>;
    applyCheckIn: (payload: ApplyCheckInRequest) => Promise<void>;
}

const FinancialContext = createContext<FinancialContextValue | null>(null);

function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? value : [];
}

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const [mutationError, setMutationError] = useState<string | null>(null);

    const assetsQuery = useQuery({
        queryKey: queryKeys.assets,
        queryFn: async () => asArray<Asset>((await assetService.getAllAssets()).data),
    });
    const liabilitiesQuery = useQuery({
        queryKey: queryKeys.liabilities,
        queryFn: async () => asArray<Liability>((await liabilityService.getAllLiabilities()).data),
    });
    const incomeQuery = useQuery({
        queryKey: queryKeys.income,
        queryFn: async () => asArray<IncomeStream>((await incomeService.getAllIncomeStreams()).data),
    });
    const expensesQuery = useQuery({
        queryKey: queryKeys.expenses,
        queryFn: async () => asArray<Expense>((await expenseService.getAllExpenses()).data),
    });
    const snapshotsQuery = useQuery({
        queryKey: queryKeys.snapshots,
        queryFn: async () => asArray<NetWorthSnapshot>((await snapshotService.getAll()).data),
    });
    const recentUpdatesQuery = useQuery({
        queryKey: queryKeys.recentUpdates,
        queryFn: async () => asArray<RecentValueUpdate>((await dashboardService.getRecentUpdates()).data),
    });
    const projectionsQuery = useQuery({
        queryKey: queryKeys.netWorthProjections(PROJECTION_YEARS),
        queryFn: async () => (await projectionService.getNetWorthProjections(PROJECTION_YEARS)).data ?? null,
    });

    const assets = useMemo(() => assetsQuery.data ?? [], [assetsQuery.data]);
    const liabilities = useMemo(() => liabilitiesQuery.data ?? [], [liabilitiesQuery.data]);
    const incomeStreams = useMemo(() => incomeQuery.data ?? [], [incomeQuery.data]);
    const expenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);
    const snapshots = useMemo(() => snapshotsQuery.data ?? [], [snapshotsQuery.data]);

    const primaryQueries = [assetsQuery, liabilitiesQuery, incomeQuery, expensesQuery, snapshotsQuery];
    const primaryLoaded = primaryQueries.every((q) => q.isSuccess || q.isError);
    const loading = !primaryLoaded;

    const summary = useMemo(
        () => (primaryLoaded ? buildDashboardSummary(assets, liabilities, incomeStreams, expenses, snapshots) : null),
        [primaryLoaded, assets, liabilities, incomeStreams, expenses, snapshots]
    );
    const allocation = useMemo(() => buildAssetAllocation(assets), [assets]);
    const netWorthHistory = useMemo(() => buildNetWorthHistory(snapshots), [snapshots]);

    const queryError = useMemo(() => {
        const failed = primaryQueries.find((q) => q.isError);
        if (!failed) return null;
        return failed.error instanceof Error ? failed.error.message : 'Failed to load financial data';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assetsQuery.error, liabilitiesQuery.error, incomeQuery.error, expensesQuery.error, snapshotsQuery.error]);

    const invalidate = useCallback(
        async (keys: QueryKey[]) => {
            await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
        },
        [queryClient]
    );

    const refresh = useCallback(async () => {
        setMutationError(null);
        await queryClient.invalidateQueries();
    }, [queryClient]);

    const runMutation = useCallback(
        async (fn: () => Promise<void>, keys: QueryKey[]) => {
            setMutationError(null);
            try {
                await fn();
                await invalidate(keys);
            } catch (err) {
                setMutationError(err instanceof Error ? err.message : 'Operation failed');
                throw err;
            }
        },
        [invalidate]
    );

    const state: FinancialState = {
        assets,
        liabilities,
        incomeStreams,
        expenses,
        snapshots,
        summary,
        allocation,
        netWorthHistory,
        netWorthProjections: projectionsQuery.data ?? null,
        recentUpdates: recentUpdatesQuery.data ?? [],
        loading,
        projectionsLoading: projectionsQuery.isFetching,
        error: mutationError ?? queryError,
    };

    const { assets: aKey, liabilities: lKey, income: iKey, expenses: eKey, snapshots: sKey, recentUpdates: rKey } = queryKeys;
    const projKey: QueryKey = ['netWorthProjections'];

    const value: FinancialContextValue = {
        state,
        refresh,
        createAsset: (data) => runMutation(async () => { await assetService.createAsset(data); }, [aKey, rKey, projKey]),
        updateAsset: (id, data) => runMutation(async () => { await assetService.updateAsset(id, data); }, [aKey, rKey, projKey]),
        deleteAsset: (id) => runMutation(async () => { await assetService.deleteAsset(id); }, [aKey, rKey, projKey]),
        createLiability: (data) => runMutation(async () => { await liabilityService.createLiability(data); }, [lKey, rKey, projKey]),
        updateLiability: (id, data) => runMutation(async () => { await liabilityService.updateLiability(id, data); }, [lKey, rKey, projKey]),
        deleteLiability: (id) => runMutation(async () => { await liabilityService.deleteLiability(id); }, [lKey, rKey, projKey]),
        createIncome: (data) => runMutation(async () => { await incomeService.createIncomeStream(data); }, [iKey, projKey]),
        updateIncome: (id, data) => runMutation(async () => { await incomeService.updateIncomeStream(id, data); }, [iKey, projKey]),
        deleteIncome: (id) => runMutation(async () => { await incomeService.deleteIncomeStream(id); }, [iKey, projKey]),
        createExpense: (data) => runMutation(async () => { await expenseService.createExpense(data); }, [eKey]),
        updateExpense: (id, data) => runMutation(async () => { await expenseService.updateExpense(id, data); }, [eKey]),
        deleteExpense: (id) => runMutation(async () => { await expenseService.deleteExpense(id); }, [eKey]),
        saveSnapshot: (month, notes) => runMutation(async () => { await snapshotService.create(month, notes); }, [sKey, rKey]),
        deleteSnapshot: (id) => runMutation(async () => { await snapshotService.delete(id); }, [sKey, rKey]),
        getCheckInStatus: async () => {
            const res = await checkInService.getStatus();
            return res.data;
        },
        getCheckInProposal: async (month) => {
            const res = await checkInService.getProposal(month);
            return res.data;
        },
        applyCheckIn: (payload) => runMutation(
            async () => { await checkInService.apply(payload); },
            [aKey, lKey, sKey, rKey, projKey]
        ),
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
