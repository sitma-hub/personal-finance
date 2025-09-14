import fs from 'fs';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import { Asset, Liability, IncomeStream, Expense, AssetType, LiabilityType, IncomeType } from '../types';

export class ImportService {
    async importFromCSV(filePath: string, dataType: string): Promise<{ imported: number; errors: string[] }> {
        const results: any[] = [];
        const errors: string[] = [];

        return new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => {
                    try {
                        const parsedData = this.parseCSVRow(data, dataType);
                        if (parsedData) {
                            results.push(parsedData);
                        }
                    } catch (error) {
                        errors.push(`Row error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                })
                .on('end', () => {
                    // Clean up file
                    fs.unlinkSync(filePath);
                    resolve({ imported: results.length, errors });
                })
                .on('error', (error) => {
                    fs.unlinkSync(filePath);
                    reject(error);
                });
        });
    }

    async importFromExcel(filePath: string, dataType: string): Promise<{ imported: number; errors: string[] }> {
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                throw new Error('No sheets found in Excel file');
            }
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) {
                throw new Error('Worksheet not found');
            }
            const data = XLSX.utils.sheet_to_json(worksheet);

            const results: any[] = [];
            const errors: string[] = [];

            data.forEach((row: any, index: number) => {
                try {
                    const parsedData = this.parseExcelRow(row, dataType);
                    if (parsedData) {
                        results.push(parsedData);
                    }
                } catch (error) {
                    errors.push(`Row ${index + 1} error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            });

            // Clean up file
            fs.unlinkSync(filePath);

            return { imported: results.length, errors };
        } catch (error) {
            fs.unlinkSync(filePath);
            throw error;
        }
    }

    private parseCSVRow(row: any, dataType: string): any {
        switch (dataType) {
            case 'assets':
                return this.parseAssetRow(row);
            case 'liabilities':
                return this.parseLiabilityRow(row);
            case 'income':
                return this.parseIncomeRow(row);
            case 'expenses':
                return this.parseExpenseRow(row);
            default:
                throw new Error(`Unknown data type: ${dataType}`);
        }
    }

    private parseExcelRow(row: any, dataType: string): any {
        return this.parseCSVRow(row, dataType);
    }

    private parseAssetRow(row: any): Partial<Asset> {
        const result: Partial<Asset> = {
            name: row.name || row.Name || '',
            type: (row.type || row.Type || 'other_asset') as AssetType,
            current_value: parseFloat(row.current_value || row['Current Value'] || '0'),
            monthly_contribution: parseFloat(row.monthly_contribution || row['Monthly Contribution'] || '0'),
            notes: row.notes || row.Notes || ''
        };

        if (row.purchase_date || row['Purchase Date']) {
            result.purchase_date = new Date(row.purchase_date || row['Purchase Date']);
        }

        if (row.purchase_price || row['Purchase Price']) {
            result.purchase_price = parseFloat(row.purchase_price || row['Purchase Price']);
        }

        if (row.annual_return_rate || row['Annual Return Rate']) {
            result.annual_return_rate = parseFloat(row.annual_return_rate || row['Annual Return Rate']);
        }

        return result;
    }

    private parseLiabilityRow(row: any): Partial<Liability> {
        const result: Partial<Liability> = {
            name: row.name || row.Name || '',
            type: (row.type || row.Type || 'other_debt') as LiabilityType,
            current_balance: parseFloat(row.current_balance || row['Current Balance'] || '0'),
            notes: row.notes || row.Notes || ''
        };

        if (row.interest_rate || row['Interest Rate']) {
            result.interest_rate = parseFloat(row.interest_rate || row['Interest Rate']);
        }

        if (row.monthly_payment || row['Monthly Payment']) {
            result.monthly_payment = parseFloat(row.monthly_payment || row['Monthly Payment']);
        }

        if (row.minimum_payment || row['Minimum Payment']) {
            result.minimum_payment = parseFloat(row.minimum_payment || row['Minimum Payment']);
        }

        if (row.due_date || row['Due Date']) {
            result.due_date = new Date(row.due_date || row['Due Date']);
        }

        return result;
    }

    private parseIncomeRow(row: any): Partial<IncomeStream> {
        const result: Partial<IncomeStream> = {
            name: row.name || row.Name || '',
            type: (row.type || row.Type || 'other_income') as IncomeType,
            current_amount: parseFloat(row.current_amount || row['Current Amount'] || '0'),
            frequency: (row.frequency || row.Frequency || 'monthly') as 'monthly' | 'annual' | 'hourly',
            annual_growth_rate: parseFloat(row.annual_growth_rate || row['Annual Growth Rate'] || '0.03'),
            notes: row.notes || row.Notes || ''
        };

        if (row.start_date || row['Start Date']) {
            result.start_date = new Date(row.start_date || row['Start Date']);
        }

        if (row.end_date || row['End Date']) {
            result.end_date = new Date(row.end_date || row['End Date']);
        }

        return result;
    }

    private parseExpenseRow(row: any): Partial<Expense> {
        return {
            name: row.name || row.Name || '',
            category: row.category || row.Category || 'Other',
            monthly_amount: parseFloat(row.monthly_amount || row['Monthly Amount'] || '0'),
            annual_inflation_rate: parseFloat(row.annual_inflation_rate || row['Annual Inflation Rate'] || '0.025'),
            is_discretionary: (row.is_discretionary || row['Is Discretionary'] || 'false').toLowerCase() === 'true',
            notes: row.notes || row.Notes || ''
        };
    }

    async exportToCSV(dataType: string): Promise<string> {
        // This would typically fetch data from the database
        // For now, return a template
        return this.getImportTemplate(dataType);
    }

    async exportToExcel(dataType: string): Promise<Buffer> {
        const csvData = await this.exportToCSV(dataType);
        const worksheet = XLSX.utils.aoa_to_sheet(csvData.split('\n').map(row => row.split(',')));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, dataType);

        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    async getImportTemplate(dataType: string): Promise<string> {
        switch (dataType) {
            case 'assets':
                return 'name,type,current_value,purchase_date,purchase_price,annual_return_rate,monthly_contribution,notes\n' +
                    'Savings Account,savings_account,10000,,,0.01,500,Main savings account\n' +
                    'Investment Portfolio,investment_account,50000,,,0.07,1000,401k and IRA accounts';

            case 'liabilities':
                return 'name,type,current_balance,interest_rate,monthly_payment,minimum_payment,due_date,notes\n' +
                    'Home Mortgage,mortgage,200000,0.035,1200,1200,,Primary residence mortgage\n' +
                    'Credit Card,credit_card,5000,0.18,200,100,,High interest credit card';

            case 'income':
                return 'name,type,current_amount,frequency,annual_growth_rate,start_date,end_date,notes\n' +
                    'Salary,salary,6000,monthly,0.03,,,Primary job salary\n' +
                    'Freelance,freelance,2000,monthly,0.05,,,Side freelance work';

            case 'expenses':
                return 'name,category,monthly_amount,annual_inflation_rate,is_discretionary,notes\n' +
                    'Rent,Housing,1500,0.03,false,Monthly rent payment\n' +
                    'Groceries,Food,400,0.025,false,Weekly grocery shopping\n' +
                    'Entertainment,Entertainment,200,0.04,true,Movies, dining out, etc.';

            default:
                throw new Error(`Unknown data type: ${dataType}`);
        }
    }
}
