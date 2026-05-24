import pool from '../config/database';
import { Asset, AssetValueHistory, CreateAssetRequest, UpdateAssetRequest } from '../types';

function normalizeDate(value: string | Date | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) {
    return `${value}-01`;
  }
  return typeof value === 'string' ? value : value.toISOString().split('T')[0];
}

export class AssetService {
  private readonly userId = 'user@example.com';

  async getAllAssets(): Promise<Asset[]> {
    const query = `
      SELECT * FROM assets 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [this.userId]);
    return result.rows;
  }

  async getAssetById(id: string): Promise<Asset | null> {
    const query = `
      SELECT * FROM assets 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
    const result = await pool.query(query, [id, this.userId]);
    return result.rows[0] || null;
  }

  async createAsset(assetData: CreateAssetRequest): Promise<Asset> {
    const {
      name,
      type,
      current_value,
      as_of_date,
      purchase_date,
      purchase_price,
      monthly_contribution = 0,
      expected_annual_return,
      pessimistic_annual_return,
      optimistic_annual_return,
      include_in_projection = true,
      notes
    } = assetData;

    const normalizedAsOf = normalizeDate(as_of_date) || new Date().toISOString().split('T')[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO assets (
          user_id, name, type, current_value, as_of_date, purchase_date, purchase_price,
          monthly_contribution, expected_annual_return, pessimistic_annual_return,
          optimistic_annual_return, include_in_projection, notes
        )
        VALUES (
          (SELECT id FROM users WHERE email = $1), $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13
        )
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        this.userId,
        name,
        type,
        current_value,
        normalizedAsOf,
        purchase_date,
        purchase_price,
        monthly_contribution,
        expected_annual_return ?? null,
        pessimistic_annual_return ?? null,
        optimistic_annual_return ?? null,
        include_in_projection,
        notes
      ]);

      const asset = result.rows[0];

      await client.query(
        `INSERT INTO asset_value_history (asset_id, value, as_of_date) VALUES ($1, $2, $3)`,
        [asset.id, current_value, normalizedAsOf]
      );

      await client.query('COMMIT');
      return asset;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateAsset(id: string, updateData: UpdateAssetRequest): Promise<Asset | null> {
    const existing = await this.getAssetById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    const dataToUpdate = { ...updateData };
    if (dataToUpdate.as_of_date) {
      dataToUpdate.as_of_date = normalizeDate(dataToUpdate.as_of_date) as string;
    }

    Object.entries(dataToUpdate).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return existing;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const query = `
        UPDATE assets 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount} AND user_id = (SELECT id FROM users WHERE email = $${paramCount + 1})
        RETURNING *
      `;

      const result = await client.query(query, [...values, id, this.userId]);
      const asset = result.rows[0];
      if (!asset) {
        await client.query('ROLLBACK');
        return null;
      }

      const valueChanged = updateData.current_value !== undefined &&
        parseFloat(String(updateData.current_value)) !== parseFloat(String(existing.current_value));

      if (valueChanged) {
        const asOfDate = normalizeDate(updateData.as_of_date as string) ||
          asset.as_of_date?.toISOString?.().split('T')[0] ||
          new Date().toISOString().split('T')[0];

        await client.query(
          `INSERT INTO asset_value_history (asset_id, value, as_of_date) VALUES ($1, $2, $3)`,
          [id, updateData.current_value, asOfDate]
        );
      }

      await client.query('COMMIT');
      return asset;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteAsset(id: string): Promise<boolean> {
    const query = `
      DELETE FROM assets 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
    const result = await pool.query(query, [id, this.userId]);
    return (result.rowCount ?? 0) > 0;
  }

  async getValueHistoryForAssets(
    assetIds: string[]
  ): Promise<Pick<AssetValueHistory, 'asset_id' | 'value' | 'as_of_date'>[]> {
    if (assetIds.length === 0) return [];

    const query = `
      SELECT h.asset_id, h.value, h.as_of_date
      FROM asset_value_history h
      JOIN assets a ON h.asset_id = a.id
      WHERE a.user_id = (SELECT id FROM users WHERE email = $1)
        AND h.asset_id = ANY($2::uuid[])
      ORDER BY h.as_of_date ASC, h.created_at ASC
    `;
    const result = await pool.query(query, [this.userId, assetIds]);
    return result.rows;
  }

  async getValueHistory(assetId: string): Promise<AssetValueHistory[]> {
    const query = `
      SELECT h.* FROM asset_value_history h
      JOIN assets a ON h.asset_id = a.id
      WHERE h.asset_id = $1 AND a.user_id = (SELECT id FROM users WHERE email = $2)
      ORDER BY h.as_of_date DESC, h.created_at DESC
    `;
    const result = await pool.query(query, [assetId, this.userId]);
    return result.rows;
  }

  async getTotalAssetsValue(): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(current_value), 0) as total_value
      FROM assets 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
    `;
    const result = await pool.query(query, [this.userId]);
    return parseFloat(result.rows[0]?.total_value || '0');
  }

  async getAssetsByType(): Promise<Record<string, number>> {
    const query = `
      SELECT type, SUM(current_value) as total_value
      FROM assets 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      GROUP BY type
    `;
    const result = await pool.query(query, [this.userId]);

    const breakdown: Record<string, number> = {};
    result.rows.forEach(row => {
      breakdown[row.type] = parseFloat(row.total_value);
    });

    return breakdown;
  }
}
