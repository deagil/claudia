import { json } from '@sveltejs/kit';
import { getUserSupabaseAccessToken } from '$lib/server/supabase/tokens';

export async function GET({ locals, cookies }) {

    const { user } = await locals.safeGetSession();
    if (!user?.id) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await getUserSupabaseAccessToken(locals);

    if (!accessToken) {
        return json({ error: 'No Supabase access token' }, { status: 401 });
    }

    // console.log('Retrieved project ID and access token', { projectId, accessTokenExists: !!accessToken });

    try {
        const res = await fetch('https://api.supabase.com/v1/organizations', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        if (res.ok) {
            const organizations = await res.json();
            const team = { name: organizations[0].name, id: organizations[0].id };

            // Read selected project from cookie
            const selectedProject = cookies.get('selected_sb_project');
            const projectRes = await fetch(`https://api.supabase.com/v1/projects/${selectedProject}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
            
            const projectData = await projectRes.json();
            const project = {id: projectData.id, name: projectData.name, status: projectData.status};
            return json({ team, project});
        }
        console.log(res);
    } catch (e) {
        console.error('Error fetching user info:', e);
        // Handle error if needed
    }

    // If token exists but can't fetch user info, still consider connected
    return json({ team: { name: 'Connected Team' }, selectedProject: null });
}