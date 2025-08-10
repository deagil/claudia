import { chatModels, DEFAULT_CHAT_MODEL } from '$lib/ai/models';
import { SelectedModel } from '$lib/hooks/selected-model.svelte.js';
import { redirect } from '@sveltejs/kit';

export async function load({ cookies, locals, url }) {
	const { supabase } = locals;
	const { safeGetSession } = locals;
	const sessionData = await safeGetSession();

	const { user } = await safeGetSession();
	const selectedWorkspaceId = cookies.get('selected-workspace');
	
	if (!user) {
		return redirect(303, '/signin');
	}
	if (!selectedWorkspaceId && !url.pathname.startsWith('/app/select-workspace')) {
  		return redirect(303, '/app/select-workspace');
	}

	// Validate that the user has access to the selected workspace
	const { data: userWorkspaces } = await supabase
		.from('workspace_users')
		.select('workspace_id')
		.eq('user_id', sessionData.user?.id);
	
	const userWorkspaceIds = userWorkspaces?.map(row => row.workspace_id) || [];
	if (selectedWorkspaceId && !userWorkspaceIds.includes(selectedWorkspaceId) && !url.pathname.startsWith('/app/select-workspace')) {
		return redirect(303, '/app/select-workspace');
	}

	const { data: profileData, error: profileError } = await supabase.from('users').select('firstname,lastname,avatar_url').eq('id', sessionData.user?.id).single();
	const { data: workspaceData, error: workspaceError } = await supabase.from('workspaces').select('*').eq('id', selectedWorkspaceId).single();

	console.log('Loaded user profile data:', profileData, 'Error:', profileError);
	console.log('Loaded user workspace data:', workspaceData, 'Error:', workspaceError);

	if (selectedWorkspaceId && workspaceError) {
		console.error('Workspace error:', workspaceError);
		return redirect(303, '/app/select-workspace');
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

	console.log('workspace data:');
	console.log(workspaceData);

	return {
		sessionData,
		profileData,
		workspaceData,
		sidebarCollapsed,
		selectedWorkspaceId,
		selectedChatModel: new SelectedModel(modelId)
	};
}