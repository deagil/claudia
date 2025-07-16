// lib/utils/table-utils.ts

/**
 * Generates a unique key for table rows
 */
export function generateRowKey(row: any, index: number, tableName?: string): string {
  const tablePrefix = tableName || 'table';
  
  // Try to use the row's ID first
  if (row.id) {
    return `${tablePrefix}-row-${row.id}-${index}`;
  }
  
  // Try other common unique identifiers
  if (row.uuid) {
    return `${tablePrefix}-row-${row.uuid}-${index}`;
  }
  
  if (row.pk) {
    return `${tablePrefix}-row-${row.pk}-${index}`;
  }
  
  // Try to create a hash from the row data
  if (row.created_at) {
    return `${tablePrefix}-row-${index}-${row.created_at}-${Date.now()}`;
  }
  
  // Fall back to index with a unique timestamp
  return `${tablePrefix}-row-${index}-${Date.now()}-${Math.random()}`;
}

/**
 * Generates a unique key for table cells
 */
export function generateCellKey(
  cell: any, 
  rowIndex: number, 
  columnId: string, 
  tableName?: string
): string {
  const tablePrefix = tableName || 'table';
  
  return `${tablePrefix}-cell-${rowIndex}-${columnId}-${Date.now()}`;
}

/**
 * Ensures data has unique identifiers for table rendering
 */
export function prepareTableData(data: any[], tableName?: string): any[] {
  return data.map((row, index) => {
    // Always add a unique table row ID to ensure uniqueness
    const uniqueId = `${tableName || 'table'}-generated-${index}-${Date.now()}-${Math.random()}`;
    
    return {
      ...row,
      _tableRowId: uniqueId,
      _originalIndex: index
    };
  });
}

/**
 * Gets the best available unique identifier from a row
 */
export function getRowIdentifier(row: any): string | number {
  return row.id || row.uuid || row.pk || row._tableRowId || JSON.stringify(row);
}