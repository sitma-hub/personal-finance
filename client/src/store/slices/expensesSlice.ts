import { createSlice } from '@reduxjs/toolkit';
import { Expense } from '../../types';

interface ExpensesState {
    expenses: Expense[];
    loading: boolean;
    error: string | null;
}

const initialState: ExpensesState = {
    expenses: [],
    loading: false,
    error: null,
};

const expensesSlice = createSlice({
    name: 'expenses',
    initialState,
    reducers: {
        // Add reducers here when implementing expense management
    },
});

export default expensesSlice.reducer;
