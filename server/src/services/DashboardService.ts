import { AssetService } from './AssetService';
import { LiabilityService } from './LiabilityService';
import { IncomeService } from './IncomeService';
import { ExpenseService } from './ExpenseService';
import { SnapshotService } from './SnapshotService';
import pool from '../config/database';
import {
  DashboardSummary,
  AssetAllocation,
  ExpenseBreakdown,
  NetWorthTrend,
  RecentValueUpdate
} from '../types';
import { getLiabilityMonthlyPayment, getTotalLiabilityMonthlyPayments } from '../utils/liabilityCashFlow';

export class DashboardService {
  private assetService = new AssetService();
  private liabilityService = new LiabilityService();
  private incomeService = new IncomeService();
  private expenseService = new ExpenseService();
  private snapshotService = new SnapshotService();

  async getDashboardSummary(): Promise<DashboardSummary> {
    const [assets, liabilities, incomeStreams, expenses, snapshots] = await Promise.all([
      this.assetService.getAllAssets(),
      this.liabilityService.getAllLiabilities(),
      this.incomeService.getAllIncomeStreams(),
      this.expenseService.getAllExpenses(),
      this.snapshotService.getAllSnapshots()
    ]);

    const totalAssets = assets.reduce((sum, asset) => sum + parseFloat(String(asset.current_value)), 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + parseFloat(String(l.current_balance)), 0);
    const netWorth = totalAssets - totalLiabilities;

    const monthlyIncome = incomeStreams.reduce((sum, income) => {
      const amount = parseFloat(String(income.current_amount));
      switch (income.frequency) {
        case 'monthly':
          return sum + amount;
        case 'annual':
          return sum + amount / 12;
        case 'hourly':
          return sum + (amount * 40 * 52) / 12;
        default:
          return sum + amount;
      }
    }, 0);

    const regularExpenses = expenses.reduce((sum, e) => sum + parseFloat(String(e.monthly_amount)), 0);
    const liabilityPayments = getTotalLiabilityMonthlyPayments(liabilities);

    const monthlyExpenses = regularExpenses + liabilityPayments;
    const monthlySavings = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      monthlyIncome,
      monthlyExpenses,
      monthlySavings,
      savingsRate,
      assetCount: assets.length,
      liabilityCount: liabilities.length,
      incomeStreamCount: incomeStreams.length,
      expenseCount: expenses.length,
      snapshotCount: snapshots.length
    };
  }

  async getAssetAllocation(): Promise<AssetAllocation[]> {
    const assets = await this.assetService.getAllAssets();
    const totalValue = assets.reduce((sum, asset) => sum + parseFloat(String(asset.current_value)), 0);

    if (totalValue === 0) return [];

    const allocationMap = new Map<string, number>();
    assets.forEach(asset => {
      const current = allocationMap.get(asset.type) || 0;
      allocationMap.set(asset.type, current + parseFloat(String(asset.current_value)));
    });

    return Array.from(allocationMap.entries()).map(([type, value]) => ({
      type,
      value,
      percentage: (value / totalValue) * 100
    }));
  }

  async getExpenseBreakdown(): Promise<ExpenseBreakdown[]> {
    const [expenses, liabilities] = await Promise.all([
      this.expenseService.getAllExpenses(),
      this.liabilityService.getAllLiabilities()
    ]);

    const breakdownMap = new Map<string, number>();

    expenses.forEach(expense => {
      const current = breakdownMap.get(expense.category) || 0;
      breakdownMap.set(expense.category, current + parseFloat(String(expense.monthly_amount)));
    });

    liabilities.forEach(liability => {
      const payment = getLiabilityMonthlyPayment(liability);
      if (payment > 0) {
        breakdownMap.set(`Debt: ${liability.name}`, payment);
      }
    });

    const totalAmount = Array.from(breakdownMap.values()).reduce((sum, v) => sum + v, 0);
    if (totalAmount === 0) return [];

    return Array.from(breakdownMap.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalAmount) * 100
    }));
  }

  async getNetWorthHistory(): Promise<NetWorthTrend[]> {
    const snapshots = await this.snapshotService.getAllSnapshots();
    return snapshots.map(s => {
      const raw = s.snapshot_month as string | Date;
      const month = typeof raw === 'string'
        ? raw.substring(0, 7)
        : new Date(raw).toISOString().substring(0, 7);
      return {
      month,
      netWorth: parseFloat(String(s.net_worth)),
      assets: parseFloat(String(s.total_assets)),
      liabilities: parseFloat(String(s.total_liabilities))
    };
    });
  }

  async getRecentValueUpdates(limit = 15): Promise<RecentValueUpdate[]> {
    const query = `
      (
        SELECT h.id, 'asset' as entity_type, h.asset_id as entity_id, a.name as entity_name,
               h.value as amount, h.as_of_date, h.created_at
        FROM asset_value_history h
        JOIN assets a ON h.asset_id = a.id
        WHERE a.user_id = (SELECT id FROM users WHERE email = 'user@example.com')
      )
      UNION ALL
      (
        SELECT h.id, 'liability' as entity_type, h.liability_id as entity_id, l.name as entity_name,
               h.balance as amount, h.as_of_date, h.created_at
        FROM liability_balance_history h
        JOIN liabilities l ON h.liability_id = l.id
        WHERE l.user_id = (SELECT id FROM users WHERE email = 'user@example.com')
      )
      ORDER BY created_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows.map(row => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityName: row.entity_name,
      amount: parseFloat(String(row.amount)),
      asOfDate: row.as_of_date,
      createdAt: row.created_at
    }));
  }
}
