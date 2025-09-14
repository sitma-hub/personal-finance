export declare class ImportService {
    importFromCSV(filePath: string, dataType: string): Promise<{
        imported: number;
        errors: string[];
    }>;
    importFromExcel(filePath: string, dataType: string): Promise<{
        imported: number;
        errors: string[];
    }>;
    private parseCSVRow;
    private parseExcelRow;
    private parseAssetRow;
    private parseLiabilityRow;
    private parseIncomeRow;
    private parseExpenseRow;
    exportToCSV(dataType: string): Promise<string>;
    exportToExcel(dataType: string): Promise<Buffer>;
    getImportTemplate(dataType: string): Promise<string>;
}
//# sourceMappingURL=ImportService.d.ts.map