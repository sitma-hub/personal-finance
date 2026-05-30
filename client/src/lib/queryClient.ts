import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

export const queryKeys = {
    assets: ['assets'] as const,
    liabilities: ['liabilities'] as const,
    income: ['income'] as const,
    expenses: ['expenses'] as const,
    snapshots: ['snapshots'] as const,
    recentUpdates: ['recentUpdates'] as const,
    netWorthProjections: (years: number) => ['netWorthProjections', years] as const,
};
