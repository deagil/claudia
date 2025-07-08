import { chatModels, DEFAULT_CHAT_MODEL } from '$lib/ai/models';
import { SelectedModel } from '$lib/hooks/selected-model.svelte.js';
import { redirect } from '@sveltejs/kit';

export async function load({ cookies, locals }) {
	const { supabase } = locals;
	const { safeGetSession } = locals;
	const sessionData = await safeGetSession();
	// console.log('Loaded session data:', sessionData);

	const { user } = await safeGetSession();
	if (!user) {
		return redirect(303, '/signin');
	}

	const { data: profileData, error: profileError } = await supabase.from('users').select('firstname,lastname,avatar_url').eq('id', sessionData.user?.id).single();
	const { data: orgData, error: orgError } = await supabase.from('orgs').select('*').in('id', Object.keys(sessionData.user?.app_metadata.orgs) || []);


	// const { error: sessionError } = await supabase.from('orgs').select().eq('user_id', sessiondata.user?.app_metadata.orgs).single();	
	console.log('Loaded user profile data:', profileData, 'Error:', profileError);
	console.log('Loaded user organization data:', orgData, 'Error:', orgError);

	// Get selected organization from cookie or default to first org
	let selectedOrgId = cookies.get('selected-org');
	let selectedOrg = null;

	if (orgData.length > 0) {
		// If no selected org in cookie, or selected org doesn't exist, use first org
		if (!selectedOrgId || !orgData.find(org => org.id === selectedOrgId)) {
			selectedOrgId = orgData[0].id;
			// Set cookie for future visits
			cookies.set('selected-org', selectedOrgId, {
				path: '/',
				expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
				httpOnly: true,
				sameSite: 'lax'
			});
		}
		selectedOrg = orgData.find(org => org.id === selectedOrgId) || orgData[0];
		console.log('Selected organization:', selectedOrg);
	}

	const sidebarCollapsed = cookies.get('sidebar:state') !== 'true';

	let modelId = cookies.get('selected-model');
	if (!modelId || !chatModels.find((model) => model.id === modelId)) {
		modelId = DEFAULT_CHAT_MODEL;
		cookies.set('selected-model', modelId, {
			path: '/',
			expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
			httpOnly: true,
			sameSite: 'lax'
		});
	}

	return {
		sessionData,
		profileData,
		orgData,
		sidebarCollapsed,
		selectedOrg,
		selectedChatModel: new SelectedModel(modelId)
	};
}
