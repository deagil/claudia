import { redirect } from '@sveltejs/kit';

export async function load({ cookies, locals }) {
  const { supabase } = locals;
  const { safeGetSession } = locals;
  const sessionData = await safeGetSession();

  const { user } = sessionData;
  if (!user) {
    return redirect(303, '/signin');
  }

  // Get all workspace_ids the user belongs to from workspace_users join table
  const { data: workspaceUserRows, error: workspaceUsersError } = await supabase
    .from('workspace_users')
    .select('workspace_id')
    .eq('user_id', user.id);

  const userWorkspaceIds = workspaceUserRows?.map(row => row.workspace_id) || [];

  // Check if user already has a selected workspace - if so, redirect to /app
  const selectedWorkspaceId = cookies.get('selected-workspace');
  if (selectedWorkspaceId) {
    if (userWorkspaceIds.includes(selectedWorkspaceId)) {
      // Verify the workspace still exists
      const { data: workspaceExists } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', selectedWorkspaceId)
        .single();

      if (workspaceExists) {
        return redirect(303, '/app');
      } else {
        // Selected workspace no longer exists, clear the cookie
        cookies.delete('selected-workspace', { path: '/' });
      }
    } else {
      // Selected workspace not in user's workspace list, clear the cookie
      cookies.delete('selected-workspace', { path: '/' });
    }
  }

  // Load user profile
  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('firstname, lastname, avatar_url')
    .eq('id', user.id)
    .single();

  // Load user's workspaces with additional info
  let workspaceData = [];
  let workspaceError = null;
  if (userWorkspaceIds.length > 0) {
    const { data, error } = await supabase
      .from('workspaces')
      .select(`
        id,
        name,
        description,
        created_at
      `)
      .in('id', userWorkspaceIds);
    workspaceData = data;
    workspaceError = error;
  }

  if (profileError) {
    console.error('Error loading d profile:', profileError);
  }
  if (workspaceError) {
    console.error('Error loading d workspaces:', workspaceError);
  }

  // If user has no workspaces, they might need to create one or be invited
  if (!workspaceData || workspaceData.length === 0) {
    console.log('User has no workspaces available');
  }

  return {
    sessionData,
    profileData,
    workspaceData: workspaceData || [],
    selectedWorkspaceId: null
  };
}

// Handle workspace selection
export const actions = {
  selectWorkspace: async ({ request, cookies, locals }) => {
    const { supabase } = locals;
    const { safeGetSession } = locals;
    const sessionData = await safeGetSession();

    const { user } = sessionData;
    if (!user) {
      return {
        status: 401,
        body: { error: 'Unauthorized' }
      };
    }

    // Get all workspace_ids the user belongs to from workspace_users join table
    const { data: workspaceUserRows, error: workspaceUsersError } = await supabase
      .from('workspace_users')
      .select('workspace_id')
      .eq('user_id', user.id);
    const userWorkspaceIds = workspaceUserRows?.map(row => row.workspace_id) || [];

    const formData = await request.formData();
    const workspaceId = formData.get('workspaceId');

    if (!workspaceId) {
      return {
        status: 400,
        body: { error: 'Workspace ID is required' }
      };
    }

    // Verify user has access to this workspace
    if (!userWorkspaceIds.includes(workspaceId)) {
      return {
        status: 403,
        body: { error: 'You do not have access to this workspace' }
      };
    }

    // Verify the workspace exists
    const { data: workspaceExists, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspaceExists) {
      return {
        status: 404,
        body: { error: 'Workspace not found' }
      };
    }

    // Set the selected workspace in cookies
    cookies.set('selected-workspace', workspaceId, {
      path: '/',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
      httpOnly: true,
      sameSite: 'lax'
    });

    // Optionally, log the workspace selection
    console.log(`User ${user.id} selected workspace: ${workspaceExists.name} (${workspaceId})`);

    return redirect(303, '/app');
  }
};