import { createSlice } from '@reduxjs/toolkit';
import { IncomeStream } from '../../types';

interface IncomeState {
    incomeStreams: IncomeStream[];
    loading: boolean;
    error: string | null;
}

const initialState: IncomeState = {
    incomeStreams: [],
    loading: false,
    error: null,
};

const incomeSlice = createSlice({
    name: 'income',
    initialState,
    reducers: {
        // Add reducers here when implementing income management
    },
});

export default incomeSlice.reducer;
