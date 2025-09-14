"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetService = void 0;
const database_1 = __importDefault(require("../config/database"));
class AssetService {
    constructor() {
        this.userId = 'user@example.com';
    }
    async getAllAssets() {
        const query = `
      SELECT * FROM assets 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      ORDER BY created_at DESC
    `;
        const result = await database_1.default.query(query, [this.userId]);
        return result.rows;
    }
    async getAssetById(id) {
        const query = `
      SELECT * FROM assets 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
        const result = await database_1.default.query(query, [id, this.userId]);
        return result.rows[0] || null;
    }
    async createAsset(assetData) {
        const { name, type, current_value, purchase_date, purchase_price, annual_return_rate, monthly_contribution = 0, notes } = assetData;
        const query = `
      INSERT INTO assets (
        user_id, name, type, current_value, purchase_date, 
        purchase_price, annual_return_rate, monthly_contribution, notes
      )
      VALUES (
        (SELECT id FROM users WHERE email = $1), $2, $3, $4, $5, $6, $7, $8, $9
      )
      RETURNING *
    `;
        const result = await database_1.default.query(query, [
            this.userId,
            name,
            type,
            current_value,
            purchase_date,
            purchase_price,
            annual_return_rate,
            monthly_contribution,
            notes
        ]);
        return result.rows[0];
    }
    async updateAsset(id, updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        });
        if (fields.length === 0) {
            return this.getAssetById(id);
        }
        const query = `
      UPDATE assets 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND user_id = (SELECT id FROM users WHERE email = $${paramCount + 1})
      RETURNING *
    `;
        const result = await database_1.default.query(query, [...values, id, this.userId]);
        return result.rows[0] || null;
    }
    async deleteAsset(id) {
        const query = `
      DELETE FROM assets 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
        const result = await database_1.default.query(query, [id, this.userId]);
        return result.rowCount > 0;
    }
    async getInvestmentHoldings(assetId) {
        const query = `
      SELECT ih.* FROM investment_holdings ih
      JOIN assets a ON ih.asset_id = a.id
      WHERE a.id = $1 AND a.user_id = (SELECT id FROM users WHERE email = $2)
      ORDER BY ih.created_at DESC
    `;
        const result = await database_1.default.query(query, [assetId, this.userId]);
        return result.rows;
    }
    async addInvestmentHolding(assetId, holdingData) {
        const { symbol, name, shares, purchase_price, purchase_date, current_price } = holdingData;
        const query = `
      INSERT INTO investment_holdings (
        asset_id, symbol, name, shares, purchase_price, 
        purchase_date, current_price
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
        const result = await database_1.default.query(query, [
            assetId,
            symbol,
            name,
            shares,
            purchase_price,
            purchase_date,
            current_price
        ]);
        return result.rows[0];
    }
    async getRealEstateProperties(assetId) {
        const query = `
      SELECT rep.* FROM real_estate_properties rep
      JOIN assets a ON rep.asset_id = a.id
      WHERE a.id = $1 AND a.user_id = (SELECT id FROM users WHERE email = $2)
      ORDER BY rep.created_at DESC
    `;
        const result = await database_1.default.query(query, [assetId, this.userId]);
        return result.rows;
    }
    async addRealEstateProperty(assetId, propertyData) {
        const { property_type, address, purchase_date, purchase_price, current_value, monthly_rental_income = 0, annual_appreciation_rate = 0.03, property_taxes_annual = 0, insurance_annual = 0, maintenance_annual = 0 } = propertyData;
        const query = `
      INSERT INTO real_estate_properties (
        asset_id, property_type, address, purchase_date, purchase_price,
        current_value, monthly_rental_income, annual_appreciation_rate,
        property_taxes_annual, insurance_annual, maintenance_annual
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
        const result = await database_1.default.query(query, [
            assetId,
            property_type,
            address,
            purchase_date,
            purchase_price,
            current_value,
            monthly_rental_income,
            annual_appreciation_rate,
            property_taxes_annual,
            insurance_annual,
            maintenance_annual
        ]);
        return result.rows[0];
    }
    async getTotalAssetsValue() {
        const query = `
      SELECT SUM(current_value) as total_value
      FROM assets 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
    `;
        const result = await database_1.default.query(query, [this.userId]);
        return parseFloat(result.rows[0]?.total_value || '0');
    }
    async getAssetsByType() {
        const query = `
      SELECT type, SUM(current_value) as total_value
      FROM assets 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      GROUP BY type
    `;
        const result = await database_1.default.query(query, [this.userId]);
        const breakdown = {};
        result.rows.forEach(row => {
            breakdown[row.type] = parseFloat(row.total_value);
        });
        return breakdown;
    }
}
exports.AssetService = AssetService;
//# sourceMappingURL=AssetService.js.map