import { json, redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserSupabaseAccessToken } from '$lib/server/supabase/tokens';

export const load: PageServerLoad = async ({ locals, cookies }) => {

    const session = await locals.safeGetSession();
    if (!session.user){
        throw redirect(302, '/login');
    }
    const token = await getUserSupabaseAccessToken(locals);

    let projects = [];

    if (token) {
        console.log('Fetching Supabase projects...');
        projects = await getSupabaseProjects(token);
        console.log('Fetched Supabase projects:', projects);
    }

    return {
        projects,
        session: session.session ?? null // Ensure session is included as required by PageData
    };
};

export const actions: Actions = {
    selectOrg: async ({ request, cookies }) => {
        const form = await request.formData();
        const orgId = form.get('orgId') as string;
        cookies.set('supabase_org', orgId, { path: '/app', httpOnly: true, sameSite: 'lax' });
        return { success: true, orgId };
    },
    selectProject: async ({ request, cookies }) => {
        const form = await request.formData();
        const projectId = form.get('projectId') as string;
        cookies.set('selected_sb_project', projectId, { path: '/app', httpOnly: true, sameSite: 'lax' });
        return { success: true, projectId };
    }
};
/**
 * To access `locals` (and `cookies`) in a function like `getSupabaseProjects`,
 * you need to pass them as parameters from the calling context.
 * Update the function signature to accept these as arguments.
 */

async function getSupabaseProjects(token: string) {
    // Use the provided token and selectedOrg to fetch projects
    const apiUrl = `https://api.supabase.com/v1/projects`;

    const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!res.ok) {
        const err = await res.text();
        console.error('Failed to fetch projects:', err);
        throw new Error(`Failed to fetch projects: ${err}`);
    }

    const projects = await res.json();
    return projects;
}