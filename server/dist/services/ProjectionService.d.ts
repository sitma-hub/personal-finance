import { InvestmentProjectionsResponse, NetWorthProjectionsResponse } from '../types';
export declare class ProjectionService {
    private assetService;
    private liabilityService;
    getInvestmentProjections(years: number): Promise<InvestmentProjectionsResponse>;
    private amortizeLiabilities;
    getNetWorthProjections(years: number): Promise<NetWorthProjectionsResponse>;
}
//# sourceMappingURL=ProjectionService.d.ts.map