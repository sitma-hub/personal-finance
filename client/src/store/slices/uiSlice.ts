import { createSlice } from '@reduxjs/toolkit';

interface UiState {
    sidebarOpen: boolean;
    theme: 'light' | 'dark';
    loading: boolean;
}

const initialState: UiState = {
    sidebarOpen: true,
    theme: 'light',
    loading: false,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleSidebar: (state) => {
            state.sidebarOpen = !state.sidebarOpen;
        },
        setTheme: (state, action) => {
            state.theme = action.payload;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
    },
});

export const { toggleSidebar, setTheme, setLoading } = uiSlice.actions;
export default uiSlice.reducer;
