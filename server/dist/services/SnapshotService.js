"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapshotService = void 0;
const database_1 = __importDefault(require("../config/database"));
const AssetService_1 = require("./AssetService");
const LiabilityService_1 = require("./LiabilityService");
function firstOfMonth(date) {
    const d = date ? new Date(date) : new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
class SnapshotService {
    constructor() {
        this.assetService = new AssetService_1.AssetService();
        this.liabilityService = new LiabilityService_1.LiabilityService();
    }
    async getAllSnapshots() {
        const query = `
      SELECT * FROM net_worth_snapshots
      ORDER BY snapshot_month ASC
    `;
        const result = await database_1.default.query(query);
        return result.rows;
    }
    async getSnapshotById(id) {
        const result = await database_1.default.query('SELECT * FROM net_worth_snapshots WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    async createSnapshot(snapshotMonth, notes) {
        const month = firstOfMonth(snapshotMonth);
        const [assets, liabilities] = await Promise.all([
            this.assetService.getAllAssets(),
            this.liabilityService.getAllLiabilities()
        ]);
        const assetBreakdown = assets.map(a => ({
            id: a.id,
            name: a.name,
            type: a.type,
            amount: parseFloat(String(a.current_value))
        }));
        const liabilityBreakdown = liabilities.map(l => ({
            id: l.id,
            name: l.name,
            type: l.type,
            amount: parseFloat(String(l.current_balance))
        }));
        const totalAssets = assetBreakdown.reduce((s, i) => s + i.amount, 0);
        const totalLiabilities = liabilityBreakdown.reduce((s, i) => s + i.amount, 0);
        const netWorth = totalAssets - totalLiabilities;
        const existing = await database_1.default.query('SELECT id FROM net_worth_snapshots WHERE snapshot_month = $1', [month]);
        if (existing.rows.length > 0) {
            const updateResult = await database_1.default.query(`UPDATE net_worth_snapshots SET
          total_assets = $1, total_liabilities = $2, net_worth = $3,
          asset_breakdown = $4, liability_breakdown = $5, notes = $6
        WHERE snapshot_month = $7
        RETURNING *`, [
                totalAssets,
                totalLiabilities,
                netWorth,
                JSON.stringify(assetBreakdown),
                JSON.stringify(liabilityBreakdown),
                notes || null,
                month
            ]);
            return updateResult.rows[0];
        }
        const result = await database_1.default.query(`INSERT INTO net_worth_snapshots (
        snapshot_month, total_assets, total_liabilities, net_worth,
        asset_breakdown, liability_breakdown, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`, [
            month,
            totalAssets,
            totalLiabilities,
            netWorth,
            JSON.stringify(assetBreakdown),
            JSON.stringify(liabilityBreakdown),
            notes || null
        ]);
        return result.rows[0];
    }
    async deleteSnapshot(id) {
        const result = await database_1.default.query('DELETE FROM net_worth_snapshots WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }
}
exports.SnapshotService = SnapshotService;
//# sourceMappingURL=SnapshotService.js.map