// // See https://svelte.dev/docs/kit/types#app.d.ts

// import type { Session, User } from '$lib/server/db/schema';

// // for information about these interfaces
// declare global {
// 	namespace App {
// 		// interface Error {}
// 		interface Locals {
// 			user?: User;
// 			session?: Session;
// 		}
// 		// interface PageData {}
// 		// interface PageState {}
// 		// interface Platform {}
// 	}
// }

// export {};


import {
	Session,
	SupabaseClient,
	type AMREntry,
	type User,
} from '@supabase/supabase-js';
// import Stripe from 'stripe';
// import 'unplugin-icons/types/svelte';
// import { Database } from './DatabaseDefinitions';

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient<Database>;
			supabaseServiceRole: SupabaseClient<Database>;
			safeGetSession: () => Promise<{
				session: Session | null;
				user: User | null;
				amr: AMREntry[] | null;
			}>;
			stripe: Stripe;
		}
		interface PageData {
			session: Session | null;
		}
		// interface Error {}
		// interface Platform {}
	}
}

export {};