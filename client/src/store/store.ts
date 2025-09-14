import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import assetsReducer from './slices/assetsSlice';
import liabilitiesReducer from './slices/liabilitiesSlice';
import incomeReducer from './slices/incomeSlice';
import expensesReducer from './slices/expensesSlice';
import scenariosReducer from './slices/scenariosSlice';
import goalsReducer from './slices/goalsSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
    reducer: {
        assets: assetsReducer,
        liabilities: liabilitiesReducer,
        income: incomeReducer,
        expenses: expensesReducer,
        scenarios: scenariosReducer,
        goals: goalsReducer,
        ui: uiReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['persist/PERSIST'],
            },
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
