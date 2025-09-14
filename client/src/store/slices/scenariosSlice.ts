import { createSlice } from '@reduxjs/toolkit';
import { Scenario } from '../../types';

interface ScenariosState {
    scenarios: Scenario[];
    loading: boolean;
    error: string | null;
}

const initialState: ScenariosState = {
    scenarios: [],
    loading: false,
    error: null,
};

const scenariosSlice = createSlice({
    name: 'scenarios',
    initialState,
    reducers: {
        // Add reducers here when implementing scenario management
    },
});

export default scenariosSlice.reducer;
