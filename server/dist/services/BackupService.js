"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const database_1 = __importDefault(require("../config/database"));
const BACKUP_VERSION = 1;
class BackupService {
    async exportAll() {
        const [assets, liabilities, income, expenses, assetHistory, liabilityHistory, snapshots] = await Promise.all([
            database_1.default.query('SELECT * FROM assets ORDER BY created_at'),
            database_1.default.query('SELECT * FROM liabilities ORDER BY created_at'),
            database_1.default.query('SELECT * FROM income_streams ORDER BY created_at'),
            database_1.default.query('SELECT * FROM expenses ORDER BY created_at'),
            database_1.default.query('SELECT * FROM asset_value_history ORDER BY as_of_date, created_at'),
            database_1.default.query('SELECT * FROM liability_balance_history ORDER BY as_of_date, created_at'),
            database_1.default.query('SELECT * FROM net_worth_snapshots ORDER BY snapshot_month')
        ]);
        return {
            version: BACKUP_VERSION,
            exported_at: new Date().toISOString(),
            assets: assets.rows,
            liabilities: liabilities.rows,
            income_streams: income.rows,
            expenses: expenses.rows,
            asset_value_history: assetHistory.rows,
            liability_balance_history: liabilityHistory.rows,
            net_worth_snapshots: snapshots.rows
        };
    }
    async importAll(payload) {
        const data = 'version' in payload ? payload : payload.data;
        if (!data || data.version !== BACKUP_VERSION) {
            throw new Error(`Unsupported backup version: ${data?.version}. Expected ${BACKUP_VERSION}.`);
        }
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM asset_value_history');
            await client.query('DELETE FROM liability_balance_history');
            await client.query('DELETE FROM net_worth_snapshots');
            await client.query('DELETE FROM assets');
            await client.query('DELETE FROM liabilities');
            await client.query('DELETE FROM income_streams');
            await client.query('DELETE FROM expenses');
            const userResult = await client.query("SELECT id FROM users WHERE email = 'user@example.com'");
            const userId = userResult.rows[0]?.id;
            if (!userId) {
                throw new Error('Default user not found');
            }
            const idMap = {
                assets: new Map(),
                liabilities: new Map()
            };
            for (const asset of data.assets || []) {
                const result = await client.query(`INSERT INTO assets (
            id, user_id, name, type, current_value, as_of_date, purchase_date, purchase_price,
            monthly_contribution, expected_annual_return, pessimistic_annual_return,
            optimistic_annual_return, include_in_projection, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (id) DO NOTHING`, [
                    asset.id,
                    userId,
                    asset.name,
                    asset.type,
                    asset.current_value,
                    asset.as_of_date,
                    asset.purchase_date,
                    asset.purchase_price,
                    asset.monthly_contribution ?? 0,
                    asset.expected_annual_return ?? null,
                    asset.pessimistic_annual_return ?? null,
                    asset.optimistic_annual_return ?? null,
                    asset.include_in_projection ?? true,
                    asset.notes,
                    asset.created_at,
                    asset.updated_at
                ]);
                if (result.rowCount)
                    idMap.assets.set(asset.id, asset.id);
            }
            for (const liability of data.liabilities || []) {
                await client.query(`INSERT INTO liabilities (
            id, user_id, name, type, current_balance, as_of_month, interest_rate,
            monthly_payment, minimum_payment, due_date, notes,
            special_repayment_enabled, special_repayment_amount, special_repayment_frequency,
            max_annual_prepayment_percentage, prepayment_penalty, prepayment_penalty_rate,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`, [
                    liability.id,
                    userId,
                    liability.name,
                    liability.type,
                    liability.current_balance,
                    liability.as_of_month,
                    liability.interest_rate,
                    liability.monthly_payment,
                    liability.minimum_payment,
                    liability.due_date,
                    liability.notes,
                    liability.special_repayment_enabled,
                    liability.special_repayment_amount,
                    liability.special_repayment_frequency,
                    liability.max_annual_prepayment_percentage,
                    liability.prepayment_penalty,
                    liability.prepayment_penalty_rate,
                    liability.created_at,
                    liability.updated_at
                ]);
                idMap.liabilities.set(liability.id, liability.id);
            }
            for (const income of data.income_streams || []) {
                await client.query(`INSERT INTO income_streams (id, user_id, name, type, current_amount, frequency, annual_growth_rate, start_date, end_date, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
                    income.id,
                    userId,
                    income.name,
                    income.type,
                    income.current_amount,
                    income.frequency,
                    income.annual_growth_rate,
                    income.start_date,
                    income.end_date,
                    income.notes,
                    income.created_at,
                    income.updated_at
                ]);
            }
            for (const expense of data.expenses || []) {
                await client.query(`INSERT INTO expenses (id, user_id, name, category, monthly_amount, annual_inflation_rate, is_discretionary, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                    expense.id,
                    userId,
                    expense.name,
                    expense.category,
                    expense.monthly_amount,
                    expense.annual_inflation_rate,
                    expense.is_discretionary,
                    expense.notes,
                    expense.created_at,
                    expense.updated_at
                ]);
            }
            for (const h of data.asset_value_history || []) {
                if (idMap.assets.has(h.asset_id) || data.assets?.some(a => a.id === h.asset_id)) {
                    await client.query(`INSERT INTO asset_value_history (id, asset_id, value, as_of_date, notes, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`, [h.id, h.asset_id, h.value, h.as_of_date, h.notes, h.created_at]);
                }
            }
            for (const h of data.liability_balance_history || []) {
                if (data.liabilities?.some(l => l.id === h.liability_id)) {
                    await client.query(`INSERT INTO liability_balance_history (id, liability_id, balance, as_of_date, notes, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`, [h.id, h.liability_id, h.balance, h.as_of_date, h.notes, h.created_at]);
                }
            }
            for (const snap of data.net_worth_snapshots || []) {
                await client.query(`INSERT INTO net_worth_snapshots (
            id, snapshot_month, total_assets, total_liabilities, net_worth,
            asset_breakdown, liability_breakdown, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
                    snap.id,
                    snap.snapshot_month,
                    snap.total_assets,
                    snap.total_liabilities,
                    snap.net_worth,
                    JSON.stringify(snap.asset_breakdown),
                    JSON.stringify(snap.liability_breakdown),
                    snap.notes,
                    snap.created_at
                ]);
            }
            await client.query('COMMIT');
            return {
                imported: {
                    assets: data.assets?.length || 0,
                    liabilities: data.liabilities?.length || 0,
                    income_streams: data.income_streams?.length || 0,
                    expenses: data.expenses?.length || 0,
                    asset_value_history: data.asset_value_history?.length || 0,
                    liability_balance_history: data.liability_balance_history?.length || 0,
                    net_worth_snapshots: data.net_worth_snapshots?.length || 0
                }
            };
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
}
exports.BackupService = BackupService;
//# sourceMappingURL=BackupService.js.map