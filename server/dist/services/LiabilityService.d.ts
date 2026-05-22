import { Liability, LiabilityBalanceHistory } from '../types';
export declare class LiabilityService {
    private readonly userId;
    getAllLiabilities(): Promise<Liability[]>;
    getLiabilityById(id: string): Promise<Liability | null>;
    createLiability(liabilityData: Partial<Liability>): Promise<Liability>;
    updateLiability(id: string, updateData: Partial<Liability>): Promise<Liability | null>;
    deleteLiability(id: string): Promise<boolean>;
    getBalanceHistory(liabilityId: string): Promise<LiabilityBalanceHistory[]>;
    getTotalLiabilitiesValue(): Promise<number>;
    getLiabilitiesByType(): Promise<Record<string, number>>;
}
//# sourceMappingURL=LiabilityService.d.ts.map