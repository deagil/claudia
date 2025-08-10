import { z } from 'zod';
import { fail, redirect } from '@sveltejs/kit';

export async function load({ locals, params }) {
	const { session } = await locals.safeGetSession();
	if (!session) {
		return redirect(307, '/signin');
	}

	// Validate step parameter
	const validSteps = ['workspace', 'profile'];
	if (!validSteps.includes(params.step)) {
		return redirect(307, '/onboarding/workspace');
	}

	// If step is profile, ensure user has a workspace
	if (params.step === 'profile') {
		const { data: { user } } = await locals.supabase.auth.getUser();
		if (!user) {
			return redirect(307, '/signin');
		}

		const { data: workspaces } = await locals.supabase
			.from('workspace_users')
			.select('workspace_id')
			.eq('user_id', user.id);

		if (!workspaces || workspaces.length === 0) {
			return redirect(307, '/onboarding/workspace');
		}
	}

	return {
		step: params.step
	};
}

// Validation schemas
const workspaceSchema = z.object({
	workspaceName: z.string().min(1, 'Workspace name is required').max(100),
	workspaceDescription: z.string().max(500).optional()
});

const profileSchema = z.object({
	firstname: z.string().min(1, 'First name is required').max(50),
	lastname: z.string().min(1, 'Last name is required').max(50),
	avatar: z.instanceof(File).optional()
});

export const actions = {
	default: async ({ request, params, locals }) => {
		const { session } = await locals.safeGetSession();
		if (!session) {
			return redirect(307, '/signin');
		}

		const { data: { user } } = await locals.supabase.auth.getUser();
		if (!user) {
			return fail(401, { success: false, message: 'User not authenticated' });
		}

		const formData = await request.formData();
		const step = params.step;

		if (step === 'workspace') {
			// Handle workspace creation
            console.log(user);

			const workspaceData = {
				workspaceName: formData.get('workspaceName'),
				workspaceDescription: formData.get('workspaceDescription') || ''
			};

			const validation = workspaceSchema.safeParse(workspaceData);
			if (!validation.success) {
				const firstError = validation.error.issues[0];
				return fail(400, {
					success: false,
					message: firstError.message,
					workspaceName: workspaceData.workspaceName as string,
					workspaceDescription: workspaceData.workspaceDescription as string
				});
			}

			const { data: validatedData } = validation;

			// Create workspace
			const { data: workspace, error: workspaceError } = await locals.supabase
				.from('workspaces')
				.insert({
					name: validatedData.workspaceName,
					description: validatedData.workspaceDescription || null,
                    owner_user_id: user.id
				})
				.select()
				.single();

			if (workspaceError) {
				return fail(500, {
					success: false,
					message: 'Failed to create workspace: ' + workspaceError.message,
					workspaceName: validatedData.workspaceName,
					workspaceDescription: validatedData.workspaceDescription
				});
			}

			// Add user to workspace as owner/admin
			const { error: memberError } = await locals.supabase
				.from('workspace_users')
				.insert({
					workspace_id: workspace.id,
					user_id: user.id,
					role: 'admin' // or 'owner'
				});

			if (memberError) {
				return fail(500, {
					success: false,
					message: 'Failed to add user to workspace: ' + memberError.message
				});
			}

			// Redirect to profile setup
			return redirect(303, '/onboarding/profile');

		} else if (step === 'profile') {
			// Handle profile completion
			const profileData = {
				firstname: formData.get('firstname'),
				lastname: formData.get('lastname'),
				avatar: formData.get('avatar') as File | null
			};

			const validation = profileSchema.safeParse(profileData);
			if (!validation.success) {
				const firstError = validation.error.issues[0];
				return fail(400, {
					success: false,
					message: firstError.message,
					firstname: profileData.firstname as string,
					lastname: profileData.lastname as string
				});
			}

			const { data: validatedData } = validation;
			let avatarUrl = null;

			// Handle avatar upload if provided
			if (validatedData.avatar && validatedData.avatar.size > 0) {
				const fileName = `${user.id}-${Date.now()}.${validatedData.avatar.name.split('.').pop()}`;
				console.log("Saving avatar as:", fileName);
				const { data: uploadData, error: uploadError } = await locals.supabase.storage
					.from('avatars')
					.upload(fileName, validatedData.avatar, {
						cacheControl: '3600',
						upsert: false
					});

				if (uploadError) {
					return fail(500, {
						success: false,
						message: 'Failed to upload avatar: ' + uploadError.message,
						firstname: validatedData.firstname,
						lastname: validatedData.lastname
					});
				}

				// Get public URL for the uploaded file
				const { data: { publicUrl } } = locals.supabase.storage
					.from('avatars')
					.getPublicUrl(uploadData.path);

				avatarUrl = publicUrl;
			}

			// Update user profile
			const { error: updateError } = await locals.supabase
				.from('users')
				.update({
					firstname: validatedData.firstname,
					lastname: validatedData.lastname,
					avatar_url: avatarUrl,
				})
				.eq('id', user.id);

			if (updateError) {
				return fail(500, {
					success: false,
					message: 'Failed to update profile: ' + updateError.message,
					firstname: validatedData.firstname,
					lastname: validatedData.lastname
				});
			}

			// Redirect to main app
			return redirect(303, '/app');
		}

		return fail(400, { success: false, message: 'Invalid step' });
	}
};