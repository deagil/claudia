// POST /api/supabase/select-project
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    // No need to parse JSON body for unselect-project

    // Remove the selected project cookie
    cookies.delete('selected_sb_project', { path: '/' });

    return json({ success: true });
  } catch (err) {
    console.error('unselect-project error', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};