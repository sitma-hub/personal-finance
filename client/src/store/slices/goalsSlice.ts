import { createSlice } from '@reduxjs/toolkit';
import { Goal } from '../../types';

interface GoalsState {
    goals: Goal[];
    loading: boolean;
    error: string | null;
}

const initialState: GoalsState = {
    goals: [],
    loading: false,
    error: null,
};

const goalsSlice = createSlice({
    name: 'goals',
    initialState,
    reducers: {
        // Add reducers here when implementing goal management
    },
});

export default goalsSlice.reducer;
