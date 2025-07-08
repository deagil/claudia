import {SUPABASE_OAUTH_CLIENT_ID, SUPABASE_OAUTH_CLIENT_SECRET } from '$env/static/private';

export async function getUserSupabaseAccessToken(locals: App.Locals): Promise<string | null> {
    const supabase = locals.supabase;
    const sessionData = await locals.safeGetSession();
    const userId = sessionData.user?.id;
    const debug = false;

    if (!userId) {
        if (debug) console.log('No user ID found in session data.');
        return null;
    }

    // Fetch token info from your DB
    const { data, error } = await supabase
        .from('user_services')
        .select('config')
        .eq('user_id', userId)
        .eq('app', 'supabase_token')
        .single();

    if (debug) console.log('Fetched Supabase token data:', data, 'Error:', error);

    if (error || !data) {
        if (debug) console.log('Error fetching Supabase token:', error);
        return null;
    }

    const config = data.config;
    const now = Math.floor(Date.now() / 1000);

    if (!config.expires_at && config.expires_in) {
        // This handles cases where old tokens don't have expires_at
        // Assume token was created recently if no expires_at
        config.expires_at = now + (config.expires_in ?? 3600);
        
        // Update the database with the calculated expires_at
        await supabase
            .from('user_services')
            .update({
                config: {
                    ...config,
                    expires_at: config.expires_at
                }
            })
            .eq('user_id', userId)
            .eq('app', 'supabase_token');
    }

    // If token is still valid (with 5 minute buffer), return it
    if (config.expires_at && config.expires_at > now + 300) {
        if (debug) console.log('Supabase token is still valid.');
        return config.access_token;
    }

    // If expired, refresh it
    if (config.refresh_token) {
        if (debug) console.log('Supabase token expired, refreshing...');
        
        const clientId = SUPABASE_OAUTH_CLIENT_ID;
        const clientSecret = SUPABASE_OAUTH_CLIENT_SECRET;
         if (debug) console.log('Client ID:', clientId, 'Client Secret:', clientSecret);
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', config.refresh_token);

        try {
            const res = await fetch('https://api.supabase.com/v1/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${basicAuth}`
                },
                body: params.toString()
            });

            if (debug) console.log('Supabase token refresh status:', res.status);

            if (res.ok) {
                const tokens = await res.json();
                const newExpiresAt = now + (tokens.expires_in ?? 3600);

                // FIXED: Properly structure the new config
                const newConfig = {
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token || config.refresh_token, // Keep old refresh token if not provided
                    token_type: tokens.token_type || 'Bearer',
                    expires_in: tokens.expires_in,
                    expires_at: newExpiresAt
                };

                // Save new tokens to DB
                await supabase
                    .from('user_services')
                    .update({ config: newConfig })
                    .eq('user_id', userId)
                    .eq('app', 'supabase_token');

                if (debug) console.log('Successfully refreshed Supabase token');
                return tokens.access_token;
            } else {
                const errorText = await res.text();
                console.error('Failed to refresh Supabase token:', errorText);
            }
        } catch (error) {
            console.error('Error refreshing Supabase token:', error);
        }
    }

    if (debug) console.log('No valid Supabase token available');
    return null;
}