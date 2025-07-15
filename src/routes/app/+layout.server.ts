import { chatModels, DEFAULT_CHAT_MODEL } from '$lib/ai/models';
import { SelectedModel } from '$lib/hooks/selected-model.svelte.js';
import { redirect } from '@sveltejs/kit';

export async function load({ cookies, locals, url }) {
	const { supabase } = locals;
	const { safeGetSession } = locals;
	const sessionData = await safeGetSession();

	const { user } = await safeGetSession();
	const selectedOrgId = cookies.get('selected-org');
	
	if (!user) {
		return redirect(303, '/signin');
	}
	if (!selectedOrgId && !url.pathname.startsWith('/app/select-org')) {
  		return redirect(303, '/app/select-org');
	}

	//select new org if currently selected org not in user metadata
	if (selectedOrgId && !Object.keys(sessionData.user?.app_metadata.orgs).includes(selectedOrgId) && !url.pathname.startsWith('/app/select-org')) {
		return redirect(303, '/app/select-org');
	}

	const { data: profileData, error: profileError } = await supabase.from('users').select('firstname,lastname,avatar_url').eq('id', sessionData.user?.id).single();
	const { data: orgData, error: orgError } = await supabase.from('orgs').select('*').eq('id', selectedOrgId).single();

	// const { error: sessionError } = await supabase.from('orgs').select().eq('user_id', sessiondata.user?.app_metadata.orgs).single();	
	console.log('Loaded user profile data:', profileData, 'Error:', profileError);
	console.log('Loaded user organization data:', orgData, 'Error:', orgError);

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

	console.log('wme	fe3fkm');
	console.log(orgData);

	return {
		sessionData,
		profileData,
		orgData,
		sidebarCollapsed,
		selectedOrgId,
		selectedChatModel: new SelectedModel(modelId)
	};
}
