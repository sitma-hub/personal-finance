import {
  Asset,
  INVESTABLE_ASSET_TYPES,
  NetWorthSnapshot,
} from '../types';
import { monthLabelFromNow } from './projection';

export interface InvestableHistoryPoint {
  month: string;
  actual: number;
}

type HistoryRow = {
  asset_id: string;
  value: number;
  as_of_date: string | Date;
};

function normalizeMonth(value: string | Date): string {
  const raw = typeof value === 'string' ? value : value.toISOString();
  return raw.substring(0, 7);
}

function toDateString(value: string | Date): string {
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
    return value.substring(0, 10);
  }
  return value.toISOString().substring(0, 10);
}
function monthEndDate(month: string): string {
  const [yearPart, monthPart] = month.split('-');
  const y = Number(yearPart);
  const m = Number(monthPart);
  const lastDay = new Date(y, m, 0).getDate();
  return `${month}-${String(lastDay).padStart(2, '0')}`;
}

function investableAssets(assets: Asset[]): Asset[] {
  return assets.filter((a) => INVESTABLE_ASSET_TYPES.includes(a.type));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildInvestableValueHistory(
  assets: Asset[],
  historyRows: HistoryRow[],
  snapshots: NetWorthSnapshot[]
): InvestableHistoryPoint[] {
  const buckets = investableAssets(assets);
  const investableIds = new Set(buckets.map((a) => a.id));
  if (investableIds.size === 0) return [];

  const entriesByAsset = new Map<string, { date: string; value: number }[]>();
  for (const row of historyRows) {
    if (!investableIds.has(row.asset_id)) continue;
    const dateStr = toDateString(row.as_of_date);
    if (!entriesByAsset.has(row.asset_id)) entriesByAsset.set(row.asset_id, []);
    entriesByAsset.get(row.asset_id)!.push({
      date: dateStr,
      value: parseFloat(String(row.value)),
    });
  }
  for (const entries of entriesByAsset.values()) {
    entries.sort((a, b) => a.date.localeCompare(b.date));
  }

  const monthSet = new Set<string>();
  for (const entries of entriesByAsset.values()) {
    for (const entry of entries) {
      monthSet.add(entry.date.substring(0, 7));
    }
  }
  for (const snap of snapshots) {
    monthSet.add(normalizeMonth(snap.snapshot_month));
  }

  const snapshotByMonth = new Map<string, number>();
  for (const snap of snapshots) {
    const month = normalizeMonth(snap.snapshot_month);
    const total = (snap.asset_breakdown || [])
      .filter((item) => investableIds.has(item.id))
      .reduce((sum, item) => sum + parseFloat(String(item.amount)), 0);
    if (total > 0) snapshotByMonth.set(month, total);
  }

  const computeTotalForMonth = (month: string): number => {
    const endDate = monthEndDate(month);
    let total = 0;
    let any = false;
    for (const assetId of investableIds) {
      const entries = entriesByAsset.get(assetId);
      if (!entries?.length) continue;
      let latest: number | null = null;
      for (const entry of entries) {
        if (entry.date <= endDate) latest = entry.value;
        else break;
      }
      if (latest != null) {
        total += latest;
        any = true;
      }
    }
    return any ? total : 0;
  };

  const result = new Map<string, number>();
  for (const month of [...monthSet].sort()) {
    const fromSnapshot = snapshotByMonth.get(month);
    if (fromSnapshot != null) {
      result.set(month, fromSnapshot);
      continue;
    }
    const fromHistory = computeTotalForMonth(month);
    if (fromHistory > 0) result.set(month, fromHistory);
  }

  const currentMonth = monthLabelFromNow(0);
  const liveTotal = buckets.reduce(
    (sum, asset) => sum + parseFloat(String(asset.current_value)),
    0
  );
  if (liveTotal > 0) result.set(currentMonth, liveTotal);

  return [...result.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, actual]) => ({ month, actual: roundMoney(actual) }));
}

export function buildPerAssetHistories(
  assets: Asset[],
  historyRows: HistoryRow[]
): Record<string, InvestableHistoryPoint[]> {
  const result: Record<string, InvestableHistoryPoint[]> = {};
  const currentMonth = monthLabelFromNow(0);

  for (const asset of investableAssets(assets)) {
    const byMonth = new Map<string, number>();
    for (const row of historyRows) {
      if (row.asset_id !== asset.id) continue;
      byMonth.set(normalizeMonth(row.as_of_date), parseFloat(String(row.value)));
    }
    byMonth.set(currentMonth, parseFloat(String(asset.current_value)));

    const points = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, actual]) => ({ month, actual: roundMoney(actual) }));

    if (points.length > 0) result[asset.id] = points;
  }

  return result;
}
