// lib/utils/columns.ts
import type { ColumnDef } from '@tanstack/table-core';

export interface DatabaseColumn {
  name: string;
  data_type: string;
  is_nullable: boolean;
  default: string | null;
  description: string | null;
  ordinal_position?: number;
  character_maximum_length?: number | null;
  numeric_precision?: number | null;
  numeric_scale?: number | null;
  is_primary_key?: boolean;
  is_foreign_key?: boolean;
  is_unique?: boolean;
}

export function generateColumns(columns: DatabaseColumn[]): ColumnDef<any, any>[] {
  // Remove duplicates based on column name
  const uniqueColumns = columns.filter((col, index, array) => 
    array.findIndex(c => c.name === col.name) === index
  );

  return uniqueColumns.map((col, index) => {
    const baseColumn: ColumnDef<any, any> = {
      id: col.name, // Use just the column name, no index needed after deduplication
      accessorKey: col.name,
      header: ({ column }) => {
        // Return a simple string for the header
        const headerText = formatColumnHeader(col.name);
        const badges = [];
        
        if (col.is_primary_key) badges.push('PK');
        if (col.is_foreign_key) badges.push('FK');
        if (col.is_unique) badges.push('U');
        
        const badgeText = badges.length > 0 ? ` (${badges.join(', ')})` : '';
        const sortIndicator = column.getIsSorted() === 'asc' ? ' ↑' : 
                            column.getIsSorted() === 'desc' ? ' ↓' : ' ↕️';
        
        return `${headerText}${badgeText}${sortIndicator}`;
      },
      cell: ({ row }) => {
        const value = row.getValue(col.name);
        return formatCellValue(value, col.data_type);
      },
      enableSorting: true,
      enableHiding: col.name !== 'id' && !col.is_primary_key,
    };

    return baseColumn;
  });
}

function formatCellValue(value: any, dataType: string): string {
  if (value === null || value === undefined) return '-';
  
  switch (dataType.toLowerCase()) {
    case 'uuid':
      return `${value.substring(0, 8)}...`;
    case 'timestamp with time zone':
    case 'timestamp':
    case 'timestamptz':
    case 'date':
      return new Date(value).toLocaleString();
    case 'boolean':
      return value ? '✓ Yes' : '✗ No';
    case 'json':
    case 'jsonb':
      return JSON.stringify(value).substring(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '');
    case 'array':
    case '_text':
    case '_varchar':
      return Array.isArray(value) ? `[${value.length} items]` : String(value);
    case 'text':
    case 'varchar':
    case 'character varying':
    case 'char':
      const str = String(value);
      return str.length > 50 ? str.substring(0, 50) + '...' : str;
    case 'integer':
    case 'bigint':
    case 'smallint':
    case 'int':
    case 'int4':
    case 'int8':
      return Number(value).toLocaleString();
    case 'numeric':
    case 'decimal':
    case 'float':
    case 'double':
    case 'real':
      return typeof value === 'number' ? value.toFixed(2) : String(value);
    default:
      return String(value);
  }
}

function formatColumnHeader(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// function formatCellValue(value: any, dataType: string): string {
//   if (value === null || value === undefined) return '-';
  
//   switch (dataType.toLowerCase()) {
//     case 'uuid':
//       return `${value.substring(0, 8)}...`;
//     case 'timestamp with time zone':
//     case 'timestamp':
//     case 'date':
//       return new Date(value).toLocaleString();
//     case 'boolean':
//       return value ? 'Yes' : 'No';
//     case 'array':
//       return Array.isArray(value) ? `[${value.length} items]` : String(value);
//     case 'json':
//     case 'jsonb':
//       return JSON.stringify(value).substring(0, 50) + '...';
//     default:
//       return String(value);
//   }
// }

export function getFilterableColumns(columns: DatabaseColumn[]): string[] {
  // Remove duplicates and get unique column names
  const uniqueColumns = columns.filter((col, index, array) => 
    array.findIndex(c => c.name === col.name) === index
  );

  return uniqueColumns
    .filter(col => {
      const type = col.data_type.toLowerCase();
      return ['text', 'varchar', 'character varying', 'uuid', 'email'].includes(type);
    })
    .map(col => col.name)
    .slice(0, 3); // Limit to 3 filterable columns to avoid UI clutter
}