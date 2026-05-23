import { AssetService } from './AssetService';
import { LiabilityService } from './LiabilityService';
import { SnapshotService } from './SnapshotService';
import {
  Asset,
  Liability,
  NetWorthSnapshot,
  CheckInProposal,
  CheckInProposalLineItem,
  CheckInStatus,
  ApplyCheckInRequest,
  SnapshotBreakdownItem,
} from '../types';
import { projectAssetMonths } from '../utils/projection';
import { isInvestableForProjection, getAssetRates } from '../utils/assetProjection';
import { getLiabilityMonthlyPayment, getLiabilityMonthlyRate } from '../utils/liabilityCashFlow';
import {
  compareMonths,
  currentMonth,
  findMissingSnapshotMonths,
  getRecommendedMonth,
  monthToDateFirst,
  monthsBetween,
  normalizeMonth,
  normalizeSnapshotMonth,
  assertNotFutureMonth,
} from '../utils/monthUtils';

function snapshotToMonth(snapshot: NetWorthSnapshot): string | null {
  return normalizeSnapshotMonth(snapshot.snapshot_month);
}

function projectLiabilityBalance(
  liability: Liability,
  startBalance: number,
  offsetMonths: number
): number {
  let balance = startBalance;
  const payment = getLiabilityMonthlyPayment(liability);
  const rate = getLiabilityMonthlyRate(liability.interest_rate);

  for (let m = 0; m < offsetMonths; m++) {
    if (balance <= 0) break;
    const interest = balance * rate;
    const principal = Math.max(0, Math.min(balance, payment - interest));
    balance = Math.max(0, balance - principal);
  }

  return Math.round(balance * 100) / 100;
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function buildAssetExplanation(
  asset: Asset,
  offsetMonths: number,
  previousAmount: number,
  proposedAmount: number
): string {
  if (offsetMonths === 0) return 'Same month as baseline';
  if (!isInvestableForProjection(asset)) return 'Carried forward (non-investable asset)';

  const contribution = parseFloat(String(asset.monthly_contribution ?? 0));
  const rates = getAssetRates(asset);
  const parts: string[] = [];

  if (contribution > 0) {
    parts.push(`+$${contribution.toLocaleString()}/mo contribution`);
  }
  parts.push(`${formatPercent(rates.expected)} annual return`);
  parts.push(`over ${offsetMonths} month${offsetMonths === 1 ? '' : 's'}`);

  if (Math.abs(proposedAmount - previousAmount) < 0.01 && contribution === 0 && rates.expected === 0) {
    return 'No change assumed';
  }

  return parts.join(', ');
}

function buildLiabilityExplanation(
  liability: Liability,
  offsetMonths: number,
  previousAmount: number,
  proposedAmount: number
): string {
  if (offsetMonths === 0) return 'Same month as baseline';

  const payment = getLiabilityMonthlyPayment(liability);
  const rate = getLiabilityMonthlyRate(liability.interest_rate);
  const parts: string[] = [];

  if (payment > 0) {
    parts.push(`$${payment.toLocaleString()}/mo payment`);
  }
  if (rate > 0) {
    parts.push(`${formatPercent(rate * 12)} interest`);
  }
  parts.push(`over ${offsetMonths} month${offsetMonths === 1 ? '' : 's'}`);

  if (Math.abs(proposedAmount - previousAmount) < 0.01 && payment === 0) {
    return 'No change assumed';
  }

  return parts.join(', ');
}

export class CheckInService {
  private assetService = new AssetService();
  private liabilityService = new LiabilityService();
  private snapshotService = new SnapshotService();

  async getStatus(): Promise<CheckInStatus> {
    const snapshots = await this.snapshotService.getAllSnapshots();
    const snapshotMonths = snapshots
      .map(snapshotToMonth)
      .filter((m): m is string => m != null);
    const cur = currentMonth();
    const missingMonths = findMissingSnapshotMonths(snapshotMonths, cur);
    const sorted = [...snapshotMonths].sort();
    const lastSnapshotMonth = sorted.length > 0 ? (sorted[sorted.length - 1] ?? null) : null;

    return {
      missingMonths,
      recommendedMonth: getRecommendedMonth(missingMonths, snapshotMonths, cur),
      lastSnapshotMonth,
      currentMonth: cur,
    };
  }

  async getProposal(targetMonthInput: string): Promise<CheckInProposal> {
    const targetMonth = normalizeMonth(targetMonthInput);
    const cur = currentMonth();
    assertNotFutureMonth(targetMonth, cur);
    const [assets, liabilities, snapshots] = await Promise.all([
      this.assetService.getAllAssets(),
      this.liabilityService.getAllLiabilities(),
      this.snapshotService.getAllSnapshots(),
    ]);

    const sortedSnapshots = [...snapshots]
      .map((s) => ({ snapshot: s, month: snapshotToMonth(s) }))
      .filter((entry): entry is { snapshot: NetWorthSnapshot; month: string } => entry.month != null)
      .sort((a, b) => compareMonths(a.month, b.month))
      .map((entry) => entry.snapshot);

    const baselineSnapshot = [...sortedSnapshots]
      .reverse()
      .find((s) => {
        const month = snapshotToMonth(s);
        return month != null && compareMonths(month, targetMonth) < 0;
      });

    let basis: 'snapshot' | 'current';
    let baselineMonth: string | null;
    const assetBaseline = new Map<string, number>();
    const liabilityBaseline = new Map<string, number>();

    if (baselineSnapshot) {
      basis = 'snapshot';
      baselineMonth = snapshotToMonth(baselineSnapshot);
      (baselineSnapshot.asset_breakdown || []).forEach((item) => {
        assetBaseline.set(item.id, parseFloat(String(item.amount)));
      });
      (baselineSnapshot.liability_breakdown || []).forEach((item) => {
        liabilityBaseline.set(item.id, parseFloat(String(item.amount)));
      });
    } else {
      basis = 'current';
      const assetDates = assets
        .map((a) => (a.as_of_date ? normalizeMonth(String(a.as_of_date)) : cur))
        .filter(Boolean);
      const liabilityDates = liabilities
        .map((l) => (l.as_of_month ? normalizeMonth(String(l.as_of_month)) : cur))
        .filter(Boolean);
      const allDates = [...assetDates, ...liabilityDates].sort();
      baselineMonth = allDates[0] ?? cur;
    }

    const offsetMonths = Math.max(0, monthsBetween(baselineMonth ?? cur, targetMonth));
    const isHistorical = compareMonths(targetMonth, cur) < 0;
    const updatesCurrentState = compareMonths(targetMonth, cur) === 0;

    const proposalAssets: CheckInProposalLineItem[] = assets.map((asset) => {
      const previousAmount = assetBaseline.has(asset.id)
        ? assetBaseline.get(asset.id)!
        : parseFloat(String(asset.current_value));

      let proposedAmount = previousAmount;
      if (offsetMonths > 0 && isInvestableForProjection(asset)) {
        const contribution = parseFloat(String(asset.monthly_contribution ?? 0));
        const rates = getAssetRates(asset);
        const series = projectAssetMonths(previousAmount, contribution, rates.expected, offsetMonths);
        proposedAmount = series[offsetMonths - 1] ?? previousAmount;
      }

      return {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        previousAmount,
        proposedAmount,
        delta: Math.round((proposedAmount - previousAmount) * 100) / 100,
        explanation: buildAssetExplanation(asset, offsetMonths, previousAmount, proposedAmount),
      };
    });

    const proposalLiabilities: CheckInProposalLineItem[] = liabilities.map((liability) => {
      const previousAmount = liabilityBaseline.has(liability.id)
        ? liabilityBaseline.get(liability.id)!
        : parseFloat(String(liability.current_balance));

      const proposedAmount =
        offsetMonths > 0
          ? projectLiabilityBalance(liability, previousAmount, offsetMonths)
          : previousAmount;

      return {
        id: liability.id,
        name: liability.name,
        type: liability.type,
        previousAmount,
        proposedAmount,
        delta: Math.round((proposedAmount - previousAmount) * 100) / 100,
        explanation: buildLiabilityExplanation(liability, offsetMonths, previousAmount, proposedAmount),
      };
    });

    const totalAssets = proposalAssets.reduce((s, a) => s + a.proposedAmount, 0);
    const totalLiabilities = proposalLiabilities.reduce((s, l) => s + l.proposedAmount, 0);

    const existingSnapshot = snapshots.find((s) => snapshotToMonth(s) === targetMonth);

    return {
      targetMonth,
      baselineMonth,
      basis,
      offsetMonths,
      isHistorical,
      updatesCurrentState,
      hasExistingSnapshot: !!existingSnapshot,
      assets: proposalAssets,
      liabilities: proposalLiabilities,
      totals: {
        assets: Math.round(totalAssets * 100) / 100,
        liabilities: Math.round(totalLiabilities * 100) / 100,
        netWorth: Math.round((totalAssets - totalLiabilities) * 100) / 100,
      },
    };
  }

  async applyCheckIn(payload: ApplyCheckInRequest): Promise<NetWorthSnapshot> {
    const cur = currentMonth();
    const targetMonth = normalizeMonth(payload.targetMonth);
    assertNotFutureMonth(targetMonth, cur);
    const updatesCurrentState = compareMonths(targetMonth, cur) === 0;
    const asOfDate = monthToDateFirst(targetMonth);

    const proposal = await this.getProposal(targetMonth);
    const assetMap = new Map(proposal.assets.map((a) => [a.id, a]));
    const liabilityMap = new Map(proposal.liabilities.map((l) => [l.id, l]));

    const enrichedAssets: SnapshotBreakdownItem[] = payload.assets.map((a) => {
      const meta = assetMap.get(a.id);
      return {
        id: a.id,
        name: a.name || meta?.name || '',
        type: a.type || meta?.type || '',
        amount: a.amount,
      };
    });

    const enrichedLiabilities: SnapshotBreakdownItem[] = payload.liabilities.map((l) => {
      const meta = liabilityMap.get(l.id);
      return {
        id: l.id,
        name: l.name || meta?.name || '',
        type: l.type || meta?.type || '',
        amount: l.amount,
      };
    });

    if (updatesCurrentState) {
      for (const item of payload.assets) {
        await this.assetService.updateAsset(item.id, {
          current_value: item.amount,
          as_of_date: asOfDate,
        });
      }

      for (const item of payload.liabilities) {
        await this.liabilityService.updateLiability(item.id, {
          current_balance: item.amount,
          as_of_month: new Date(`${asOfDate}T12:00:00`),
        });
      }

      return this.snapshotService.createSnapshot(asOfDate, payload.notes);
    }

    return this.snapshotService.createSnapshotFromBreakdown(
      asOfDate,
      enrichedAssets,
      enrichedLiabilities,
      payload.notes
    );
  }
}
