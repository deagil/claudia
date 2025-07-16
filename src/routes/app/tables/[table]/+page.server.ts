// +page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, fetch }) => {
  const { table } = params;
  
  if (!table) {
    throw error(400, 'Table name is required');
  }

  // Get pagination parameters
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  try {
    // Fetch table data from our API endpoint
    console.log(`fetching table data for ${encodeURIComponent(table)}&page=${page}&limit=${limit}`)
    const response = await fetch(`/api/supabase/table?table=${encodeURIComponent(table)}&page=${page}&limit=${limit}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw error(response.status, errorData.error || 'Failed to fetch table data');
    }

    const data = await response.json();

    return {
      columns: data.columns,
      rows: data.rows,
      pagination: data.pagination,
      tableMetadata: data.tableMetadata,
      tableName: table
    };
  } catch (err) {
    console.error('Error loading table data:', err);
    throw error(500, 'Failed to load table data');
  }
};