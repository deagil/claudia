import { redirect } from '@sveltejs/kit';

export async function load({ cookies, locals }) {
  try {
    const { supabase } = locals;
    const { safeGetSession } = locals;
    
    // Get session with error handling
    let sessionData;
    try {
      sessionData = await safeGetSession();
    } catch (error) {
      console.error('Error getting session:', error);
      return redirect(303, '/signin');
    }

    const { user } = sessionData;
    if (!user) {
      return redirect(303, '/signin');
    }

    // Get all workspace_ids the user belongs to from workspace_users join table
    let workspaceUserRows: any[] = [];
    let userWorkspaceIds: string[] = [];
    try {
      const { data, error } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching workspace users:', error);
        // Continue with empty array instead of failing
        workspaceUserRows = [];
      } else {
        workspaceUserRows = data || [];
      }
      
      userWorkspaceIds = workspaceUserRows.map(row => row.workspace_id).filter(Boolean) || [];
    } catch (error) {
      console.error('Error processing workspace users:', error);
      userWorkspaceIds = [];
    }

    // Check if user already has a selected workspace - if so, redirect to /app
    const selectedWorkspaceId = cookies.get('selected-workspace');
    if (selectedWorkspaceId) {
      if (userWorkspaceIds.includes(selectedWorkspaceId)) {
        // Verify the workspace still exists
        try {
          const { data: workspaceExists, error: workspaceError } = await supabase
            .from('workspaces')
            .select('id')
            .eq('id', selectedWorkspaceId)
            .single();

          if (workspaceError) {
            console.error('Error checking workspace existence:', workspaceError);
            // Clear the cookie if there's an error
            cookies.delete('selected-workspace', { path: '/' });
          } else if (workspaceExists) {
            return redirect(303, '/app');
          } else {
            // Selected workspace no longer exists, clear the cookie
            cookies.delete('selected-workspace', { path: '/' });
          }
        } catch (error) {
          console.error('Error verifying workspace:', error);
          cookies.delete('selected-workspace', { path: '/' });
        }
      } else {
        // Selected workspace not in user's workspace list, clear the cookie
        cookies.delete('selected-workspace', { path: '/' });
      }
    }

    // Load user profile with error handling
    let profileData = null;
    try {
      console.log('Loading user profile for user ID:', user.id);
      console.log('User object from session:', { id: user.id, email: user.email });
      
      const { data, error } = await supabase
        .from('users')
        .select('firstname, lastname, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error loading user profile:', error);
        console.log('This might indicate the user exists in auth but not in the users table');
        // Use auth user data as fallback
        profileData = {
          firstname: user.user_metadata?.first_name || user.user_metadata?.name || null,
          lastname: user.user_metadata?.last_name || null,
          avatar_url: user.user_metadata?.avatar_url || null
        };
      } else {
        profileData = data;
        console.log('Successfully loaded user profile:', profileData);
      }
    } catch (error) {
      console.error('Error processing user profile:', error);
      // Use auth user data as fallback
      profileData = {
        firstname: user.user_metadata?.first_name || user.user_metadata?.name || null,
        lastname: user.user_metadata?.last_name || null,
        avatar_url: user.user_metadata?.avatar_url || null
      };
    }

    // Load user's workspaces with additional info
    let workspaceData: any[] = [];
    if (userWorkspaceIds.length > 0) {
      try {
        console.log('Loading workspaces for user workspace IDs:', userWorkspaceIds);
        const { data, error } = await supabase
          .from('workspaces')
          .select(`
            id,
            name,
            description,
            created_at
          `)
          .in('id', userWorkspaceIds);
        
        if (error) {
          console.error('Error loading workspaces:', error);
          workspaceData = [];
        } else {
          workspaceData = data || [];
          console.log('Raw workspace data from database:', workspaceData);
          
          // Debug: Check for workspaces with undefined IDs
          if (data) {
            const invalidWorkspaces = data.filter(ws => !ws.id);
            if (invalidWorkspaces.length > 0) {
              console.error('Found workspaces with undefined IDs:', invalidWorkspaces);
            }
            const workspacesWithoutNames = data.filter(ws => !ws.name);
            if (workspacesWithoutNames.length > 0) {
              console.error('Found workspaces without names:', workspacesWithoutNames);
            }
            console.log('Loaded workspaces:', data.map(ws => ({ id: ws.id, name: ws.name, description: ws.description })));
          }
        }
      } catch (error) {
        console.error('Error processing workspaces:', error);
        workspaceData = [];
      }
    } else {
      console.log('No workspace IDs found for user');
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
  } catch (error) {
    console.error('Unexpected error in select-workspace load function:', error);
    // Return a minimal response instead of throwing
    return {
      sessionData: { user: null, session: null, amr: null },
      profileData: null,
      workspaceData: [],
      selectedWorkspaceId: null,
      error: 'Failed to load workspace data'
    };
  }
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
    const { data: workspaceUserRows, error: _workspaceUsersError } = await supabase
      .from('workspace_users')
      .select('workspace_id')
      .eq('user_id', user.id);
    const userWorkspaceIds = workspaceUserRows?.map(row => row.workspace_id) || [];

    const formData = await request.formData();
    const workspaceId = formData.get('workspaceId') as string;

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