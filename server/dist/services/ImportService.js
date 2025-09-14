"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportService = void 0;
const fs_1 = __importDefault(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const XLSX = __importStar(require("xlsx"));
class ImportService {
    async importFromCSV(filePath, dataType) {
        const results = [];
        const errors = [];
        return new Promise((resolve, reject) => {
            fs_1.default.createReadStream(filePath)
                .pipe((0, csv_parser_1.default)())
                .on('data', (data) => {
                try {
                    const parsedData = this.parseCSVRow(data, dataType);
                    if (parsedData) {
                        results.push(parsedData);
                    }
                }
                catch (error) {
                    errors.push(`Row error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            })
                .on('end', () => {
                fs_1.default.unlinkSync(filePath);
                resolve({ imported: results.length, errors });
            })
                .on('error', (error) => {
                fs_1.default.unlinkSync(filePath);
                reject(error);
            });
        });
    }
    async importFromExcel(filePath, dataType) {
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);
            const results = [];
            const errors = [];
            data.forEach((row, index) => {
                try {
                    const parsedData = this.parseExcelRow(row, dataType);
                    if (parsedData) {
                        results.push(parsedData);
                    }
                }
                catch (error) {
                    errors.push(`Row ${index + 1} error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            });
            fs_1.default.unlinkSync(filePath);
            return { imported: results.length, errors };
        }
        catch (error) {
            fs_1.default.unlinkSync(filePath);
            throw error;
        }
    }
    parseCSVRow(row, dataType) {
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
    parseExcelRow(row, dataType) {
        return this.parseCSVRow(row, dataType);
    }
    parseAssetRow(row) {
        return {
            name: row.name || row.Name || '',
            type: (row.type || row.Type || 'other_asset'),
            current_value: parseFloat(row.current_value || row['Current Value'] || '0'),
            purchase_date: row.purchase_date || row['Purchase Date'] ? new Date(row.purchase_date || row['Purchase Date']) : undefined,
            purchase_price: row.purchase_price || row['Purchase Price'] ? parseFloat(row.purchase_price || row['Purchase Price']) : undefined,
            annual_return_rate: row.annual_return_rate || row['Annual Return Rate'] ? parseFloat(row.annual_return_rate || row['Annual Return Rate']) : undefined,
            monthly_contribution: parseFloat(row.monthly_contribution || row['Monthly Contribution'] || '0'),
            notes: row.notes || row.Notes || ''
        };
    }
    parseLiabilityRow(row) {
        return {
            name: row.name || row.Name || '',
            type: (row.type || row.Type || 'other_debt'),
            current_balance: parseFloat(row.current_balance || row['Current Balance'] || '0'),
            interest_rate: row.interest_rate || row['Interest Rate'] ? parseFloat(row.interest_rate || row['Interest Rate']) : undefined,
            monthly_payment: row.monthly_payment || row['Monthly Payment'] ? parseFloat(row.monthly_payment || row['Monthly Payment']) : undefined,
            minimum_payment: row.minimum_payment || row['Minimum Payment'] ? parseFloat(row.minimum_payment || row['Minimum Payment']) : undefined,
            due_date: row.due_date || row['Due Date'] ? new Date(row.due_date || row['Due Date']) : undefined,
            notes: row.notes || row.Notes || ''
        };
    }
    parseIncomeRow(row) {
        return {
            name: row.name || row.Name || '',
            type: (row.type || row.Type || 'other_income'),
            current_amount: parseFloat(row.current_amount || row['Current Amount'] || '0'),
            frequency: (row.frequency || row.Frequency || 'monthly'),
            annual_growth_rate: parseFloat(row.annual_growth_rate || row['Annual Growth Rate'] || '0.03'),
            start_date: row.start_date || row['Start Date'] ? new Date(row.start_date || row['Start Date']) : undefined,
            end_date: row.end_date || row['End Date'] ? new Date(row.end_date || row['End Date']) : undefined,
            notes: row.notes || row.Notes || ''
        };
    }
    parseExpenseRow(row) {
        return {
            name: row.name || row.Name || '',
            category: row.category || row.Category || 'Other',
            monthly_amount: parseFloat(row.monthly_amount || row['Monthly Amount'] || '0'),
            annual_inflation_rate: parseFloat(row.annual_inflation_rate || row['Annual Inflation Rate'] || '0.025'),
            is_discretionary: (row.is_discretionary || row['Is Discretionary'] || 'false').toLowerCase() === 'true',
            notes: row.notes || row.Notes || ''
        };
    }
    async exportToCSV(dataType) {
        return this.getImportTemplate(dataType);
    }
    async exportToExcel(dataType) {
        const csvData = await this.exportToCSV(dataType);
        const worksheet = XLSX.utils.aoa_to_sheet(csvData.split('\n').map(row => row.split(',')));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, dataType);
        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
    async getImportTemplate(dataType) {
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
exports.ImportService = ImportService;
//# sourceMappingURL=ImportService.js.map