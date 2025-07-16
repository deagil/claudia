// +server.ts (Enhanced with retry logic and better error handling)
import { json } from '@sveltejs/kit';
import { getUserSupabaseAccessToken } from '$lib/server/supabase/tokens';

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

// Retry function with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} to fetch ${url}`);
      
      // Add timeout to the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
      
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Fetches column metadata and table data for a specific table.
 */
export async function GET({ url, locals, cookies }) {
  const table = url.searchParams.get('table');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const offset = (page - 1) * limit;

  console.log('Fetching data for table:', table, { page, limit, offset });

  if (!table) {
    return json({ error: 'Missing table name' }, { status: 400 });
  }

  // Validate table name to prevent SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    return json({ error: 'Invalid table name' }, { status: 400 });
  }

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

  // Try different API endpoints
  const apiUrls = [
    `https://api.supabase.com/v1/projects/${projectId}/database/query`,
    `https://${projectId}.supabase.co/rest/v1/rpc/exec_sql`, // Alternative endpoint
  ];

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'SvelteKit-App/1.0'
  };

  for (const apiUrl of apiUrls) {
    try {
      console.log(`Trying API endpoint: ${apiUrl}`);

      // 1. Check if table exists
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${table}'
        );
      `;

      const tableExistsRes = await fetchWithRetry(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: tableExistsQuery })
      });

      if (!tableExistsRes.ok) {
        const errorText = await tableExistsRes.text();
        throw new Error(`API returned ${tableExistsRes.status}: ${errorText}`);
      }

      const tableExists = await tableExistsRes.json();
      if (!tableExists[0]?.exists) {
        return json({ error: 'Table not found' }, { status: 404 });
      }

      // 2. Fetch basic column metadata (simplified query for better compatibility)
      const columnsQuery = `
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
      `;

      const columnsRes = await fetchWithRetry(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: columnsQuery })
      });

      if (!columnsRes.ok) {
        throw new Error(`Failed to fetch columns: ${await columnsRes.text()}`);
      }

      const columns = await columnsRes.json();

      // Debug: Log the columns to see what we're getting
      console.log('Raw columns from database:', columns.length);
      console.log('Column names:', columns.map(c => c.name));
      
      // Remove any duplicate columns that might be coming from the database
      const uniqueColumns = columns.filter((col, index, array) => 
        array.findIndex(c => c.name === col.name) === index
      );
      
      console.log('Unique columns after deduplication:', uniqueColumns.length);
      console.log('Unique column names:', uniqueColumns.map(c => c.name));

      // 3. Get total count
      const countQuery = `SELECT COUNT(*) as total FROM public.${table};`;
      
      const countRes = await fetchWithRetry(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: countQuery })
      });

      let totalRows = 0;
      if (countRes.ok) {
        const countResult = await countRes.json();
        totalRows = countResult[0]?.total || 0;
      }

      // 4. Fetch table data with pagination
      const orderColumn = columns.find(col => col.name === 'created_at') ? 'created_at' : 
                          columns.find(col => col.name === 'id') ? 'id' : 
                          columns[0]?.name || '1';

      const rowsQuery = `
        SELECT * 
        FROM public.${table} 
        ORDER BY ${orderColumn} DESC
        LIMIT ${limit} 
        OFFSET ${offset};
      `;

      const rowsRes = await fetchWithRetry(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: rowsQuery })
      });

      if (!rowsRes.ok) {
        throw new Error(`Failed to fetch rows: ${await rowsRes.text()}`);
      }

      const rows = await rowsRes.json();

      console.log(`✅ Successfully fetched ${rows.length} rows from ${table} (${totalRows} total)`);

      return json({
        columns: uniqueColumns.map(col => ({
          ...col,
          description: null,
          character_maximum_length: null,
          numeric_precision: null,
          numeric_scale: null,
          is_primary_key: col.name === 'id',
          is_foreign_key: false,
          is_unique: false
        })),
        rows,
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
      });

    } catch (error) {
      console.error(`API endpoint ${apiUrl} failed:`, error.message);
      continue; // Try next endpoint
    }
  }

  // If all endpoints failed
  console.error('All API endpoints failed');
  return json(
    { 
      error: 'Unable to connect to Supabase API. Please check your network connection and try again.',
      details: 'Network connectivity issue - please verify your internet connection and DNS settings.'
    }, 
    { status: 503 }
  );
}