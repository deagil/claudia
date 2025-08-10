// import {
// 	createSession,
// 	generateSessionToken,
// 	setSessionTokenCookie
// } from '$lib/server/auth/index.js';
// import { createAuthUser, getAuthUser } from '$lib/server/db/queries.js';
// import type { AuthUser } from '$lib/server/db/schema.js';
import { fail, redirect } from '@sveltejs/kit';
// import { compare } from 'bcrypt-ts';
// import { err, ok, safeTry } from 'neverthrow';
import { z } from 'zod';

export async function load({ locals }) {
	const { session } = await locals.safeGetSession();
	if (session) {
		return redirect(307, '/app');
	}
}

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8);

export const actions = {
	default: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const rawEmail = formData.get('email');
		const email = emailSchema.safeParse(rawEmail);
		if (!email.success) {
			return fail(400, {
				success: false,
				message: 'Invalid email',
				email: (rawEmail ?? undefined) as string | undefined
			} as const);
		}
		const password = passwordSchema.safeParse(formData.get('password'));
		if (!password.success) {
			return fail(400, { success: false, message: 'Invalid password' } as const);
		}

		 let result;
        if (params.authType === 'signup') {
            result = await locals.supabase.auth.signUp({
                email: email.data,
                password: password.data
            });
        } else {
            result = await locals.supabase.auth.signInWithPassword({
                email: email.data,
                password: password.data
            });
        }

        if (result.error) {
            return fail(400, {
                success: false,
                message: `Failed to ${params.authType === 'signup' ? 'sign up' : 'sign in'}: ${result.error.message}`
            });
        }

		//if the user is not part of a workspace, redirect them to the app
		// 1. Get the user ID from the session
        const { data: { user } } = await locals.supabase.auth.getUser();
        if (!user) {
            return fail(400, { success: false, message: 'User not found after auth.' });
        }

		// 2. Check if user is part of any workspace
        const { data: workspaces, error: workspaceError } = await locals.supabase
            .from('workspace_users')
            .select('workspace_id')
            .eq('user_id', user.id);

		if (workspaceError) {
            return fail(500, { success: false, message: 'Failed to check workspace membership.' });
        }

		 if (!workspaces || workspaces.length === 0) {
            // Redirect to workspace creation page or render workspace creation form
            return redirect(303, '/onboarding/workspace');
        }

        // 3. Check if user's profile is complete
        const { data: userProfile, error: userProfileError } = await locals.supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (userProfileError) {
            return fail(500, { success: false, message: 'Failed to fetch user profile.' });
        }

		// Example: check for required fields (customize as needed)
        if (!userProfile.firstname || !userProfile.lastname || !userProfile.avatar_url) {
            return redirect(303, '/onboarding/profile');
        }

		return redirect(303, '/app');
	}
};
