import { redirect } from '@sveltejs/kit';

export async function load({ cookies, locals }) {
  const { supabase } = locals;
  const { safeGetSession } = locals;
  const sessionData = await safeGetSession();

  const { user } = sessionData;
  if (!user) {
    return redirect(303, '/signin');
  }

  // Get all org_ids the user belongs to from org_users join table
  const { data: orgUserRows, error: orgUsersError } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id);

  const userOrgIds = orgUserRows?.map(row => row.org_id) || [];

  // Check if user already has a selected org - if so, redirect to /app
  const selectedOrgId = cookies.get('selected-org');
  if (selectedOrgId) {
    if (userOrgIds.includes(selectedOrgId)) {
      // Verify the org still exists
      const { data: orgExists } = await supabase
        .from('orgs')
        .select('id')
        .eq('id', selectedOrgId)
        .single();

      if (orgExists) {
        return redirect(303, '/app');
      } else {
        // Selected org no longer exists, clear the cookie
        cookies.delete('selected-org', { path: '/' });
      }
    } else {
      // Selected org not in user's org list, clear the cookie
      cookies.delete('selected-org', { path: '/' });
    }
  }

  // Load user profile
  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('firstname, lastname, avatar_url')
    .eq('id', user.id)
    .single();

  // Load user's organizations with additional info
  let orgData = [];
  let orgError = null;
  if (userOrgIds.length > 0) {
    const { data, error } = await supabase
      .from('orgs')
      .select(`
        id,
        name,
        description,
        created_at
      `)
      .in('id', userOrgIds);
    orgData = data;
    orgError = error;
  }

  if (profileError) {
    console.error('Error loading profile:', profileError);
  }
  if (orgError) {
    console.error('Error loading organizations:', orgError);
  }

  // If user has no orgs, they might need to create one or be invited
  if (!orgData || orgData.length === 0) {
    console.log('User has no organizations available');
  }

  return {
    sessionData,
    profileData,
    orgData: orgData || [],
    selectedOrgId: null
  };
}

// Handle organization selection
export const actions = {
  selectOrg: async ({ request, cookies, locals }) => {
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

    // Get all org_ids the user belongs to from org_users join table
    const { data: orgUserRows, error: orgUsersError } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id);
    const userOrgIds = orgUserRows?.map(row => row.org_id) || [];

    const formData = await request.formData();
    const orgId = formData.get('orgId');

    if (!orgId) {
      return {
        status: 400,
        body: { error: 'Organization ID is required' }
      };
    }

    // Verify user has access to this organization
    if (!userOrgIds.includes(orgId)) {
      return {
        status: 403,
        body: { error: 'You do not have access to this organization' }
      };
    }

    // Verify the organization exists
    const { data: orgExists, error: orgError } = await supabase
      .from('orgs')
      .select('id, name')
      .eq('id', orgId)
      .single();

    if (orgError || !orgExists) {
      return {
        status: 404,
        body: { error: 'Organization not found' }
      };
    }

    // Set the selected organization in cookies
    cookies.set('selected-org', orgId, {
      path: '/',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
      httpOnly: true,
      sameSite: 'lax'
    });

    // Optionally, log the organization selection
    console.log(`User ${user.id} selected organization: ${orgExists.name} (${orgId})`);

    return redirect(303, '/app');
  }
};