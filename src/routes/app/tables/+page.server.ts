import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Table } from './columns';

export const load: PageServerLoad = async ({
  fetch,
  locals: { safeGetSession },
}) => {
  const session = await safeGetSession();

  if (!session?.user) {
    throw redirect(303, '/signin');
  }

  console.error('Fetching tables data');
  const res = await fetch('/api/supabase/tables');
  if (!res.ok) {
    console.error('Error fetching tables:', res);
    throw redirect(303, '/app');
  }
  const { tables } = await res.json();
  return { tables: tables as Table[], session: session.session };
}