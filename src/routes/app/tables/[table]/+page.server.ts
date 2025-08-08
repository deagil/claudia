// +page.server.ts (Improved with better error handling and types)
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

interface TableLoadResult {
  columns: any[];
  rows: Record<string, any>[];
  pagination: {
    page: number;
    limit: number;
    totalRows: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  tableMetadata: null;
  tableName: string;
}

export const load: PageServerLoad = async ({ params, url, fetch }): Promise<TableLoadResult> => {
  const { table } = params;
  
  if (!table) {
    error(400, 'Table name is required');
  }

  // Validate and sanitize pagination parameters
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));

  try {
    const searchParams = new URLSearchParams({
      table: encodeURIComponent(table),
      page: page.toString(),
      limit: limit.toString()
    });

    console.log(`Loading table data: ${table} (page ${page}, limit ${limit})`);
    
    const response = await fetch(`/api/supabase/table?${searchParams}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('API Error:', errorData);
      
      // Map HTTP status codes to appropriate errors
      switch (response.status) {
        case 401:
          throw error(401, 'Authentication required');
        case 403:
          throw error(403, 'Access forbidden');
        case 404:
          throw error(404, `Table '${table}' not found`);
        case 408:
          throw error(408, 'Request timeout - please try again');
        default:
         throw error(response.status, errorData.error || 'Failed to fetch table data');
      }
    }

    const data = await response.json();

    // Validate response structure
    if (!data.columns || !Array.isArray(data.rows)) {
      console.error('Invalid response structure:', data);
      error(500, 'Invalid response from API');
    }

    return {
      columns: data.columns,
      rows: data.rows,
      pagination: data.pagination,
      tableMetadata: data.tableMetadata,
      tableName: table
    };

  } catch (err) {
    console.error('Error loading table data:', err);
    
    // Re-throw SvelteKit errors
    if (err?.status) {
      throw err;
    }
    
    // Handle other errors
    error(500, 'Failed to load table data');
  }
};