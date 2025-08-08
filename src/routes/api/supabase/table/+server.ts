// +server.ts (Simplified and improved)
import { json } from '@sveltejs/kit';
import { getUserSupabaseAccessToken } from '$lib/server/supabase/tokens';
import type { RequestHandler } from './$types';

interface DatabaseColumn {
  name: string;
  data_type: string;
  is_nullable: boolean;
  default: string | null;
  description: string | null;
  ordinal_position: number;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
}

interface TableResponse {
  columns: DatabaseColumn[];
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

// Simplified fetch with single timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Validate table name to prevent SQL injection
function validateTableName(table: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table);
}

// Execute SQL query against Supabase
async function executeQuery(projectId: string, accessToken: string, query: string): Promise<any> {
  const apiUrl = `https://api.supabase.com/v1/projects/${projectId}/database/query`;
  
  const response = await fetchWithTimeout(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Database query failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
  try {
    // Extract and validate parameters
    const table = url.searchParams.get('table');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('limit') || '100')));
    const offset = (page - 1) * limit;

    if (!table) {
      return json({ error: 'Missing table name' }, { status: 400 });
    }

    if (!validateTableName(table)) {
      return json({ error: 'Invalid table name' }, { status: 400 });
    }

    // Check authentication
    const { user } = await locals.safeGetSession();
    if (!user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = cookies.get('selected_sb_project');
    if (!projectId) {
      return json({ error: 'No project selected' }, { status: 400 });
    }

    const accessToken = await getUserSupabaseAccessToken(locals);
    if (!accessToken) {
      return json({ error: 'No Supabase access token' }, { status: 401 });
    }

    // Check if table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `;

    const tableExistsResult = await executeQuery(projectId, accessToken, 
      tableExistsQuery.replace('$1', `'${table}'`)
    );

    if (!tableExistsResult[0]?.exists) {
      return json({ error: 'Table not found' }, { status: 404 });
    }

    // Fetch column metadata in parallel with count
    const [columnsResult, countResult] = await Promise.all([
      executeQuery(projectId, accessToken, `
        SELECT
          column_name AS name,
          data_type,
          is_nullable = 'YES' AS is_nullable,
          column_default AS default,
          ordinal_position
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '${table}'
        ORDER BY ordinal_position;
      `),
      executeQuery(projectId, accessToken, `SELECT COUNT(*) as total FROM public.${table};`)
    ]);

    // Process columns and remove duplicates
    const uniqueColumns = columnsResult.filter((col: any, index: number, array: any[]) => 
      array.findIndex(c => c.name === col.name) === index
    );

    const totalRows = countResult[0]?.total || 0;

    // Determine order column
    const orderColumn = uniqueColumns.find((col: any) => col.name === 'created_at')?.name || 
                       uniqueColumns.find((col: any) => col.name === 'id')?.name || 
                       uniqueColumns[0]?.name || '1';

    // Fetch table data
    const rowsResult = await executeQuery(projectId, accessToken, `
      SELECT * 
      FROM public.${table} 
      ORDER BY ${orderColumn} DESC
      LIMIT ${limit} 
      OFFSET ${offset};
    `);

    const response: TableResponse = {
      columns: uniqueColumns.map((col: any) => ({
        ...col,
        description: null,
        character_maximum_length: null,
        numeric_precision: null,
        numeric_scale: null,
        is_primary_key: col.name === 'id',
        is_foreign_key: false,
        is_unique: false
      })),
      rows: rowsResult,
      pagination: {
        page,
        limit,
        totalRows,
        totalPages: Math.ceil(totalRows / limit),
        hasNextPage: offset + limit < totalRows,
        hasPreviousPage: page > 1
      },
      tableMetadata: null,
      tableName: table
    };

    console.log(`✅ Successfully fetched ${rowsResult.length} rows from ${table} (${totalRows} total)`);
    return json(response);

  } catch (error) {
    console.error('Database query error:', error);
    
    // Return appropriate error based on error type
    if (error.message.includes('timeout') || error.message.includes('AbortError')) {
      return json(
        { error: 'Request timeout. Please try again.' }, 
        { status: 408 }
      );
    }
    
    if (error.message.includes('Database query failed')) {
      return json(
        { error: 'Database query failed', details: error.message }, 
        { status: 500 }
      );
    }

    return json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
};