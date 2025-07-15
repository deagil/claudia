// src/routes/api/supabase/enable_history
import { json } from '@sveltejs/kit';
import { encrypt, decrypt } from '$lib/crypto'
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getUserSupabaseAccessToken } from '$lib/server/supabase/tokens.js';

export async function POST({ request, locals, cookies }) {
    try {
        const { app, config } = await request.json();
        const { user } = await locals.safeGetSession();
        let selectedOrgId = cookies.get('selected-org');

        // Get the user ID from the session
        if (!user) {
            return json({ error: 'Unauthorized, no user' }, { status: 401 });
        }

        if (!config) {
            throw new Error('Config is undefined.');
        }

        const managementToken = await getUserSupabaseAccessToken(locals);

        if (!managementToken) {
            return json({ error: 'No Supabase access token' }, { status: 401 });
        }

        //SQL query to execute
        const historySql = createHistorySql();

        //execute SQL using management api
        const res = await fetch('https://api.supabase.com/v1/projects/{ref}/database/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${managementToken}`
            },
            body: historySql
        });

        //fetch tables
        const tablesRes = await fetch('/api/supabase/tables');
        if (!res.ok) {
            console.error('Error fetching tables:', res);
            throw redirect(303, '/app');
        }
        const { tables } = await tablesRes.json();

        tables.forEach(table => {
              const enableRes = await fetch('https://api.supabase.com/v1/projects/{ref}/database/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${managementToken}`
            },
            body: historySql
        });

        });


        // Encrypt the credentials
        const encryptedCredentials = encrypt(JSON.stringify(config));

    } catch (error) {
        console.error('Server error:', error);
        return json({ error: error.message }, { status: 500 });
    }
}

// export async function GET({ request, locals }) {
//   try {
//     const { user, supabaseServiceRole } = locals;
//     const { app } = await request.json();

//     console.log('Received app:', app);

//     if (!app) {
//       return json({ error: 'Missing app parameter' }, { status: 400 });
//     }

//     if (!user) {
//       return json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { data, error } = await supabaseServiceRole
//       .from('user_services')
//       .select('config')
//       .eq('user_id', user.id)
//       .eq('app', app)
//       .single();

//     if (error || !data) {
//       return json({ error: 'No config found' }, { status: 404 });
//     }

//     const decryptedConfig = JSON.parse(decrypt(data.config));
//     console.log('Decrypted config:', decryptedConfig);

//     return json({ config: decryptedConfig });
//   } catch (error) {
//     console.error('Server error:', error);
//     return json({ error: 'Server error' }, { status: 500 });
//   }
// }

export const GET: RequestHandler = async ({ url, locals }) => {
    try {
        const { supabaseServiceRole, safeGetSession } = locals;

        const session = await safeGetSession();

        if (!session.user) {
            return json({ error: 'Unauthorized, no user here' }, { status: 401 });
        }

        // Extract the "app" parameter from the query string
        const app = url.searchParams.get('app');
        if (!app) {
            return json({ error: 'Missing app parameter' }, { status: 400 });
        }

        // Query the database for the given user's service config for the specified app
        const { data, error } = await supabaseServiceRole
            .from('user_services')
            .select('config')
            .eq('user_id', session.user.id)
            .eq('app', app)
            .single();

        if (error || !data) {
            return json({ error: 'No config found' }, { status: 404 });
        }

        // Decrypt the stored configuration
        const decryptedConfig = JSON.parse(decrypt(data.config));

        return json({ config: decryptedConfig });
    } catch (error: any) {
        console.error('Server error:', error);
        return json({ error: error.message || 'Server error' }, { status: 500 });
    }
};

// Add this to your save-credentials/+server.js
export const DELETE: RequestHandler = async ({ url, locals }) => {
    try {
        const { user, supabaseServiceRole } = locals;

        if (!user) {
            return json({ error: 'Unauthorized to delete ' }, { status: 401 });
        }

        const app = url.searchParams.get('app');
        if (!app) {
            return json({ error: 'Missing app parameter' }, { status: 400 });
        }

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
        return json({ error: error.message }, { status: 500 });
    }
};

/**
 * Generates the SQL query to fetch table information from the Supabase database.
 * @param {string|null} filterName - Optional filter for table name.
 * @returns {string} - The SQL query string.
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
                created_at TIMESTAMPTZ DEFAULT NOW(),
                -- Indexes for performance
                CONSTRAINT audit_log_operation_check CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE'))
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
                -- These are set by Supabase automatically or can be set manually
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
                    -- For DELETE: store the entire deleted record
                    v_before := row_to_json(OLD)::JSONB;
                    v_after := NULL;
                    
                    -- All columns are considered "changed" in a delete
                    SELECT array_agg(key) INTO v_changed_columns
                    FROM jsonb_each(v_before);
                    
                ELSIF TG_OP = 'UPDATE' THEN
                    -- For UPDATE: only store changed columns
                    v_before := '{}'::JSONB;
                    v_after := '{}'::JSONB;
                    
                    -- Compare each column to find changes
                    FOR v_key IN SELECT key FROM jsonb_each_text(row_to_json(OLD)::jsonb) LOOP
                        v_old_value := (row_to_json(OLD)::jsonb) -> v_key;
                        v_new_value := (row_to_json(NEW)::jsonb) -> v_key;
                        
                        -- Check if values are different
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
                    -- For INSERT: store the entire new record
                    v_before := NULL;
                    v_after := row_to_json(NEW)::JSONB;
                    
                    -- All columns are considered "changed" in an insert
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

            -- Create function to quickly enable audit logging on a given table
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

                -- Generate trigger name
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

            CREATE OR REPLACE FUNCTION public.remove_audit_logging_from_table(table_name TEXT)
            RETURNS TEXT AS $$
            DECLARE
                trigger_name TEXT;
                result_message TEXT;
            BEGIN
                -- Generate trigger name
                trigger_name := 'audit_trigger_' || table_name;
                
                -- Check if trigger exists
                IF EXISTS (
                    SELECT 1 FROM information_schema.triggers
                    WHERE trigger_name = remove_audit_logging_from_table.trigger_name
                    AND event_object_table = remove_audit_logging_from_table.table_name
                ) THEN
                    -- Drop the trigger
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