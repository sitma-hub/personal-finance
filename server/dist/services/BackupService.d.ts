import { BackupData } from '../types';
export declare class BackupService {
    exportAll(): Promise<BackupData>;
    importAll(payload: BackupData | {
        success?: boolean;
        data: BackupData;
    }): Promise<{
        imported: Record<string, number>;
    }>;
}
//# sourceMappingURL=BackupService.d.ts.map