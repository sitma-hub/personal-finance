import { createSlice } from '@reduxjs/toolkit';
import { Liability } from '../../types';

interface LiabilitiesState {
    liabilities: Liability[];
    loading: boolean;
    error: string | null;
}

const initialState: LiabilitiesState = {
    liabilities: [],
    loading: false,
    error: null,
};

const liabilitiesSlice = createSlice({
    name: 'liabilities',
    initialState,
    reducers: {
        // Add reducers here when implementing liability management
    },
});

export default liabilitiesSlice.reducer;
