// src/routes/api/supabase/enable_history/+server.js
import { json } from '@sveltejs/kit';
import { encrypt, decrypt } from '$lib/crypto';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getUserSupabaseAccessToken } from '$lib/server/supabase/tokens.js';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
    try {
        const { app, config } = await request.json();
        const { user } = await locals.safeGetSession();
        const selectedOrgId = cookies.get('selected-org');
        const selectedProject = cookies.get('selected_sb_project');

        // Validate required parameters
        if (!user) {
            return json({ error: 'Unauthorized, no user' }, { status: 401 });
        }

        if (!selectedProject) {
            return json({ error: 'No Supabase project selected' }, { status: 400 });
        }

        if (!config) {
            return json({ error: 'Config is required' }, { status: 400 });
        }

        // Get management token
        const managementToken = await getUserSupabaseAccessToken(locals);
        if (!managementToken) {
            return json({ error: 'No Supabase access token' }, { status: 401 });
        }

        // Create audit logging infrastructure
        console.log('Creating audit logging infrastructure...');
        const historySql = createHistorySql();
        
        const createInfraRes = await fetch(`https://api.supabase.com/v1/projects/${selectedProject}/database/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${managementToken}`
            },
            body: new URLSearchParams({ query: historySql }).toString()
        });

        if (!createInfraRes.ok) {
            const errorText = await createInfraRes.text();
            console.error('Error creating audit infrastructure:', errorText);
            return json({ 
                error: 'Failed to create audit logging infrastructure',
                details: errorText 
            }, { status: 500 });
        }

        console.log('Audit infrastructure created successfully');

        // Fetch tables to enable audit logging
        const tablesRes = await fetch(`/api/supabase/tables`, {
            headers: {
                'Cookie': `selected-org=${selectedOrgId}; selected_sb_project=${selectedProject}`
            }
        });

        if (!tablesRes.ok) {
            console.error('Error fetching tables:', await tablesRes.text());
            return json({ error: 'Failed to fetch tables' }, { status: 500 });
        }

        const { tables } = await tablesRes.json();
        
        if (!tables || !Array.isArray(tables)) {
            return json({ error: 'Invalid tables response' }, { status: 500 });
        }

        // Enable audit logging for each table
        const enableResults = [];
        const errors = [];

        for (const table of tables) {
            try {
                console.log(`Enabling audit logging for table: ${table.name}`);
                
                const enableSql = `SELECT public.add_audit_logging_to_table('${table.name}');`;
                
                const enableRes = await fetch(`https://api.supabase.com/v1/projects/${selectedProject}/database/query`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${managementToken}`
                    },
                    body: new URLSearchParams({ query: enableSql }).toString()
                });

                if (enableRes.ok) {
                    const result = await enableRes.json();
                    enableResults.push({
                        table: table.name,
                        success: true,
                        message: result[0]?.add_audit_logging_to_table || 'Enabled successfully'
                    });
                    console.log(`✓ Audit logging enabled for ${table.name}`);
                } else {
                    const errorText = await enableRes.text();
                    errors.push({
                        table: table.name,
                        error: errorText
                    });
                    console.error(`✗ Failed to enable audit logging for ${table.name}:`, errorText);
                }
            } catch (error) {
                errors.push({
                    table: table.name,
                    error: error.message
                });
                console.error(`✗ Exception enabling audit logging for ${table.name}:`, error);
            }
        }

        // Save encrypted credentials if provided
        if (config && Object.keys(config).length > 0) {
            try {
                const encryptedCredentials = encrypt(JSON.stringify(config));
                
                // Save to user_services table
                const { error: saveError } = await locals.supabaseServiceRole
                    .from('user_services')
                    .upsert({
                        user_id: user.id,
                        app: app || 'supabase_audit',
                        config: encryptedCredentials,
                        updated_at: new Date().toISOString()
                    });

                if (saveError) {
                    console.error('Error saving config:', saveError);
                    return json({ 
                        error: 'Failed to save configuration',
                        audit_results: enableResults,
                        audit_errors: errors
                    }, { status: 500 });
                }
            } catch (encryptError) {
                console.error('Error encrypting config:', encryptError);
                return json({ 
                    error: 'Failed to encrypt configuration',
                    audit_results: enableResults,
                    audit_errors: errors
                }, { status: 500 });
            }
        }

        return json({
            message: 'Audit logging setup completed',
            tables_processed: tables.length,
            successful_tables: enableResults.length,
            failed_tables: errors.length,
            results: enableResults,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Server error:', error);
        return json({ 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 });
    }
};

export const GET: RequestHandler = async ({ url, locals }) => {
    try {
        const { supabaseServiceRole, safeGetSession } = locals;
        const session = await safeGetSession();

        if (!session.user) {
            return json({ error: 'Unauthorized, no user' }, { status: 401 });
        }

        // Extract the "app" parameter from the query string
        const app = url.searchParams.get('app') || 'supabase_audit';

        // Query the database for the given user's service config for the specified app
        const { data, error } = await supabaseServiceRole
            .from('user_services')
            .select('config, updated_at')
            .eq('user_id', session.user.id)
            .eq('app', app)
            .single();

        if (error || !data) {
            return json({ error: 'No config found' }, { status: 404 });
        }

        // Decrypt the stored configuration
        const decryptedConfig = JSON.parse(decrypt(data.config));

        return json({ 
            config: decryptedConfig,
            updated_at: data.updated_at
        });
    } catch (error: any) {
        console.error('Server error:', error);
        return json({ error: error.message || 'Server error' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
    try {
        const { user, supabaseServiceRole } = locals;

        if (!user) {
            return json({ error: 'Unauthorized to delete' }, { status: 401 });
        }

        const app = url.searchParams.get('app') || 'supabase_audit';

        const { error } = await supabaseServiceRole
            .from('user_services')
            .delete()
            .eq('user_id', user.id)
            .eq('app', app);

        if (error) {
            return json({ error: error.message }, { status: 500 });
        }

        return json({ message: 'Credentials removed successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        return json({ error: error.message }, { status: 500 });
    }
};

// Additional endpoint to disable audit logging
export const PUT: RequestHandler = async ({ request, locals, cookies }) => {
    try {
        const { tables } = await request.json();
        const { user } = await locals.safeGetSession();
        const selectedProject = cookies.get('selected_sb_project');

        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!selectedProject) {
            return json({ error: 'No Supabase project selected' }, { status: 400 });
        }

        const managementToken = await getUserSupabaseAccessToken(locals);
        if (!managementToken) {
            return json({ error: 'No Supabase access token' }, { status: 401 });
        }

        const disableResults = [];
        const errors = [];

        for (const tableName of tables) {
            try {
                const disableSql = `SELECT public.remove_audit_logging_from_table('${tableName}');`;
                
                const disableRes = await fetch(`https://api.supabase.com/v1/projects/${selectedProject}/database/query`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${managementToken}`
                    },
                    body: new URLSearchParams({ query: disableSql }).toString()
                });

                if (disableRes.ok) {
                    const result = await disableRes.json();
                    disableResults.push({
                        table: tableName,
                        success: true,
                        message: result[0]?.remove_audit_logging_from_table || 'Disabled successfully'
                    });
                } else {
                    const errorText = await disableRes.text();
                    errors.push({
                        table: tableName,
                        error: errorText
                    });
                }
            } catch (error) {
                errors.push({
                    table: tableName,
                    error: error.message
                });
            }
        }

        return json({
            message: 'Audit logging disable completed',
            results: disableResults,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Server error:', error);
        return json({ error: error.message }, { status: 500 });
    }
};

/**
 * Generates the SQL query to create audit logging infrastructure
 * @returns {string} - The SQL query string
 */
function createHistorySql() {
    return `
-- Create audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_table TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_before JSONB,
    record_after JSONB,
    changed_columns TEXT[],
    user_id UUID,
    user_email TEXT,
    user_role TEXT,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_log_table_id ON public.audit_log(record_table, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON public.audit_log(operation);

-- Create function which takes a record change and writes a log record
CREATE OR REPLACE FUNCTION public.universal_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_before JSONB;
    v_after JSONB;
    v_changed_columns TEXT[] := ARRAY[]::TEXT[];
    v_user_id UUID;
    v_user_email TEXT;
    v_user_role TEXT;
    v_session_id TEXT;
    v_ip_address INET;
    v_user_agent TEXT;
    v_record_id TEXT;
    v_key TEXT;
    v_old_value JSONB;
    v_new_value JSONB;
BEGIN
    -- Extract user information from current session
    BEGIN
        v_user_id := COALESCE(
            (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::UUID,
            (current_setting('app.user_id', true))::UUID
        );
        
        v_user_email := COALESCE(
            current_setting('request.jwt.claims', true)::jsonb ->> 'email',
            current_setting('app.user_email', true)
        );
        
        v_user_role := COALESCE(
            current_setting('request.jwt.claims', true)::jsonb ->> 'role',
            current_setting('app.user_role', true)
        );
        
        v_session_id := COALESCE(
            current_setting('request.jwt.claims', true)::jsonb ->> 'session_id',
            current_setting('app.session_id', true)
        );
        
        v_ip_address := COALESCE(
            current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for',
            current_setting('app.ip_address', true)
        )::INET;
        
        v_user_agent := COALESCE(
            current_setting('request.headers', true)::jsonb ->> 'user-agent',
            current_setting('app.user_agent', true)
        );
    EXCEPTION WHEN OTHERS THEN
        -- If we can't get user info, continue without it
        v_user_id := NULL;
        v_user_email := NULL;
        v_user_role := NULL;
        v_session_id := NULL;
        v_ip_address := NULL;
        v_user_agent := NULL;
    END;

    -- Determine record ID (assumes 'id' column exists, adjust if needed)
    v_record_id := COALESCE(
        (NEW.id)::TEXT,
        (OLD.id)::TEXT,
        'unknown'
    );

    -- Handle different operations
    IF TG_OP = 'DELETE' THEN
        v_before := row_to_json(OLD)::JSONB;
        v_after := NULL;
        
        SELECT array_agg(key) INTO v_changed_columns
        FROM jsonb_each(v_before);
        
    ELSIF TG_OP = 'UPDATE' THEN
        v_before := '{}'::JSONB;
        v_after := '{}'::JSONB;
        
        FOR v_key IN SELECT key FROM jsonb_each_text(row_to_json(OLD)::jsonb) LOOP
            v_old_value := (row_to_json(OLD)::jsonb) -> v_key;
            v_new_value := (row_to_json(NEW)::jsonb) -> v_key;
            
            IF v_old_value IS DISTINCT FROM v_new_value THEN
                v_before := v_before || jsonb_build_object(v_key, v_old_value);
                v_after := v_after || jsonb_build_object(v_key, v_new_value);
                v_changed_columns := v_changed_columns || v_key;
            END IF;
        END LOOP;
        
        -- If no changes detected, don't log
        IF v_before = '{}'::JSONB THEN
            RETURN NULL;
        END IF;
        
    ELSIF TG_OP = 'INSERT' THEN
        v_before := NULL;
        v_after := row_to_json(NEW)::JSONB;
        
        SELECT array_agg(key) INTO v_changed_columns
        FROM jsonb_each(v_after);
    END IF;

    -- Insert audit record
    INSERT INTO public.audit_log(
        record_table,
        record_id,
        operation,
        record_before,
        record_after,
        changed_columns,
        user_id,
        user_email,
        user_role,
        session_id,
        ip_address,
        user_agent
    ) VALUES (
        TG_TABLE_NAME,
        v_record_id,
        TG_OP,
        v_before,
        v_after,
        v_changed_columns,
        v_user_id,
        v_user_email,
        v_user_role,
        v_session_id,
        v_ip_address,
        v_user_agent
    );

    -- Return appropriate value for trigger
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to enable audit logging on a table
CREATE OR REPLACE FUNCTION public.add_audit_logging_to_table(table_name TEXT)
RETURNS TEXT AS $$
DECLARE
    trigger_name TEXT;
    result_message TEXT;
BEGIN
    -- Validate table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = add_audit_logging_to_table.table_name
    ) THEN
        RAISE EXCEPTION 'Table public.% does not exist', table_name;
    END IF;

    trigger_name := 'audit_trigger_' || table_name;
    
    -- Check if trigger already exists
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = add_audit_logging_to_table.trigger_name
        AND event_object_table = add_audit_logging_to_table.table_name
    ) THEN
        result_message := 'Audit logging already enabled for table: ' || table_name;
    ELSE
        -- Create the trigger
        EXECUTE format('
            CREATE TRIGGER %I
            AFTER INSERT OR UPDATE OR DELETE ON public.%I
            FOR EACH ROW EXECUTE FUNCTION public.universal_audit_trigger();
        ', trigger_name, table_name);
        
        result_message := 'Audit logging successfully enabled for table: ' || table_name;
    END IF;
    
    RETURN result_message;
END;
$$ LANGUAGE plpgsql;

-- Create function to disable audit logging on a table
CREATE OR REPLACE FUNCTION public.remove_audit_logging_from_table(table_name TEXT)
RETURNS TEXT AS $$
DECLARE
    trigger_name TEXT;
    result_message TEXT;
BEGIN
    trigger_name := 'audit_trigger_' || table_name;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = remove_audit_logging_from_table.trigger_name
        AND event_object_table = remove_audit_logging_from_table.table_name
    ) THEN
        EXECUTE format('DROP TRIGGER %I ON public.%I;', trigger_name, table_name);
        result_message := 'Audit logging successfully removed from table: ' || table_name;
    ELSE
        result_message := 'No audit logging found for table: ' || table_name;
    END IF;
    
    RETURN result_message;
END;
$$ LANGUAGE plpgsql;
`;
}