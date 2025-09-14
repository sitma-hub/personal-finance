import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Asset, AssetFormData, ApiResponse } from '../../types';
import { assetService } from '../../services/assetService';

interface AssetsState {
    assets: Asset[];
    loading: boolean;
    error: string | null;
    selectedAsset: Asset | null;
}

const initialState: AssetsState = {
    assets: [],
    loading: false,
    error: null,
    selectedAsset: null,
};

// Async thunks
export const fetchAssets = createAsyncThunk(
    'assets/fetchAssets',
    async () => {
        const response = await assetService.getAllAssets();
        return response.data;
    }
);

export const createAsset = createAsyncThunk(
    'assets/createAsset',
    async (assetData: AssetFormData) => {
        const response = await assetService.createAsset(assetData);
        return response.data;
    }
);

export const updateAsset = createAsyncThunk(
    'assets/updateAsset',
    async ({ id, data }: { id: string; data: Partial<AssetFormData> }) => {
        const response = await assetService.updateAsset(id, data);
        return response.data;
    }
);

export const deleteAsset = createAsyncThunk(
    'assets/deleteAsset',
    async (id: string) => {
        await assetService.deleteAsset(id);
        return id;
    }
);

export const fetchAssetById = createAsyncThunk(
    'assets/fetchAssetById',
    async (id: string) => {
        const response = await assetService.getAssetById(id);
        return response.data;
    }
);

const assetsSlice = createSlice({
    name: 'assets',
    initialState,
    reducers: {
        setSelectedAsset: (state, action: PayloadAction<Asset | null>) => {
            state.selectedAsset = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch assets
            .addCase(fetchAssets.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAssets.fulfilled, (state, action) => {
                state.loading = false;
                state.assets = action.payload || [];
            })
            .addCase(fetchAssets.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch assets';
            })
            // Create asset
            .addCase(createAsset.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createAsset.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload) {
                    state.assets.push(action.payload);
                }
            })
            .addCase(createAsset.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to create asset';
            })
            // Update asset
            .addCase(updateAsset.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateAsset.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload) {
                    const index = state.assets.findIndex(asset => asset.id === action.payload!.id);
                    if (index !== -1) {
                        state.assets[index] = action.payload;
                    }
                    if (state.selectedAsset?.id === action.payload.id) {
                        state.selectedAsset = action.payload;
                    }
                }
            })
            .addCase(updateAsset.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to update asset';
            })
            // Delete asset
            .addCase(deleteAsset.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteAsset.fulfilled, (state, action) => {
                state.loading = false;
                state.assets = state.assets.filter(asset => asset.id !== action.payload);
                if (state.selectedAsset?.id === action.payload) {
                    state.selectedAsset = null;
                }
            })
            .addCase(deleteAsset.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to delete asset';
            })
            // Fetch asset by ID
            .addCase(fetchAssetById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAssetById.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedAsset = action.payload || null;
            })
            .addCase(fetchAssetById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch asset';
            });
    },
});

export const { setSelectedAsset, clearError } = assetsSlice.actions;
export default assetsSlice.reducer;
