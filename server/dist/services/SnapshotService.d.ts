import { NetWorthSnapshot } from '../types';
export declare class SnapshotService {
    private assetService;
    private liabilityService;
    getAllSnapshots(): Promise<NetWorthSnapshot[]>;
    getSnapshotById(id: string): Promise<NetWorthSnapshot | null>;
    createSnapshot(snapshotMonth?: string, notes?: string): Promise<NetWorthSnapshot>;
    deleteSnapshot(id: string): Promise<boolean>;
}
//# sourceMappingURL=SnapshotService.d.ts.map