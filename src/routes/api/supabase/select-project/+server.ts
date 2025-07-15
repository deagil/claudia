// POST /api/supabase/select-project
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { projectId, projectName } = await request.json();

    if (!projectId || !projectName) {
      return json({ error: 'Missing projectId or projectName' }, { status: 400 });
    }

    // --- OPTIONAL: Persist in your database ---
    // await db.supabaseSelections.upsert({
    //   user_id: locals.user.id,
    //   project_id: projectId,
    //   project_name: projectName
    // });

    // Set a cookie so that subsequent /api/supabase/check calls know which project
    cookies.set('selected_sb_project', projectId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    return json({ success: true });
  } catch (err) {
    console.error('select-project error', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};