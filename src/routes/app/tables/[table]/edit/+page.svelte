<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Switch } from '$lib/components/ui/switch';
  	import * as Select from "$lib/components/ui/select/index.js";
	import { Separator } from '$lib/components/ui/separator';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';

	let { data } = $props();
	let {
		table,
		columns,
		user_facing_name,
		table_description,
		audit_logging_enabled,
	} = data;

	// State management
	let userFacingName = $state(user_facing_name);
	let tableDescription = $state(table_description);
	let auditLoggingEnabled = $state(audit_logging_enabled);

	// Form state
	let isSubmitting = $state(false);
	let formMessage = $state('');
	let messageType = $state(''); // 'success' | 'error'
	let validationErrors = $state({} as { [key: string]: string });

	// Column management
	let columnList = $state(
		columns.map((col, i) => ({
			...col,
			id: col.column_name,
			index: i,
			include_in_forms: col.include_in_forms ?? true,
		})),
	);

	let selectedColumn = $state(null);
	let selectedColumnIndex = $state(0);

	// Static configuration - using $state.raw for better performance
	const tallyMappingOptions = $state.raw({
		text: {
			options: [
				{ value: 'INPUT_TEXT', label: 'Short Text' },
				{ value: 'TEXTAREA', label: 'Long Text' },
				{ value: 'INPUT_LINK', label: 'URL' },
				{ value: 'INPUT_PHONE_NUMBER', label: 'Phone Number' },
				{ value: 'INPUT_EMAIL', label: 'Email Address' },
			],
			extraFields: [],
		},
		integer: {
			options: [{ value: 'INPUT_NUMBER', label: 'Input Number' }],
			extraFields: [
				{ name: 'min', label: 'Minimum Value', type: 'number' },
				{ name: 'max', label: 'Maximum Value', type: 'number' },
				{ name: 'step', label: 'Step', type: 'number' },
			],
		},
		boolean: {
			options: [{ value: 'CHECKBOX', label: 'Checkbox' }],
			extraFields: [],
		},
		timestamptz: {
			options: [{ value: 'INPUT_DATE', label: 'Input Date' }],
			extraFields: [],
		},
		date: {
			options: [{ value: 'INPUT_DATE', label: 'Input Date' }],
			extraFields: [],
		},
		timestamp: {
			options: [{ value: 'INPUT_DATE', label: 'Input Date' }],
			extraFields: [],
		},
		uuid: {
			options: [{ value: 'INPUT_TEXT', label: 'Input Text' }],
			extraFields: [],
		},
	});

	// Derived state
	let allowedMapping = $derived.by(() => {
		return (
			tallyMappingOptions[selectedColumn?.data_type] ?? {
				options: [{ value: 'INPUT_TEXT', label: 'Input Text' }],
				extraFields: [],
			}
		);
	});

	let hasUnsavedChanges = $derived.by(() => {
		return (
			userFacingName !== user_facing_name ||
			tableDescription !== table_description ||
			auditLoggingEnabled !== audit_logging_enabled ||
			JSON.stringify(columnList) !== JSON.stringify(columns.map((col, i) => ({
				...col,
				id: col.column_name,
				index: i,
				include_in_forms: col.include_in_forms ?? true,
			})))
		);
	});

	// Effects
	$effect.pre(() => {
		if (!selectedColumn && columnList.length > 0) {
			selectedColumn = columnList[0];
			selectedColumnIndex = 0;
		}
	});

	// Unsaved changes warning
	$effect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (hasUnsavedChanges) {
				e.preventDefault();
				e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
			}
		};
		
		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	});

	// Functions
	function validateForm() {
		const errors = {};
		
		if (!userFacingName.trim()) {
			errors.userFacingName = 'User facing name is required';
		}
		
		if (!tableDescription.trim()) {
			errors.tableDescription = 'Table description is required';
		}
		
		// Validate columns
		for (const col of columnList) {
			if (col.include_in_forms && !col.user_facing_label?.trim()) {
				errors[`col_${col.index}_user_facing_label`] = 'User facing label is required for columns included in forms';
			}
			
			if (col.include_in_forms && !col.tally_field_type) {
				errors[`col_${col.index}_tally_field_type`] = 'Tally field type is required for columns included in forms';
			}
		}
		
		validationErrors = errors;
		return Object.keys(errors).length === 0;
	}

	function updateExtraField(fieldName: string, value: any) {
		if (!selectedColumn) return;
		
		selectedColumn.tally_specific_options = {
			...selectedColumn.tally_specific_options,
			[fieldName]: value === '' ? undefined : value,
		};
	}

	function selectColumn(col: any, index: number) {
		selectedColumn = col;
		selectedColumnIndex = index;
	}

	function navigateBack() {
		if (hasUnsavedChanges) {
			if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
				goto('/app/data');
			}
		} else {
			goto('/app/data');
		}
	}

	function handleKeyNavigation(event: KeyboardEvent, col: any, index: number) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			selectColumn(col, index);
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			const nextIndex = Math.min(index + 1, columnList.length - 1);
			const nextElement = document.querySelector(`[data-column-index="${nextIndex}"]`) as HTMLElement;
			nextElement?.focus();
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			const prevIndex = Math.max(index - 1, 0);
			const prevElement = document.querySelector(`[data-column-index="${prevIndex}"]`) as HTMLElement;
			prevElement?.focus();
		}
	}

	function clearMessage() {
		formMessage = '';
		messageType = '';
	}
</script>

<form 
	method="POST"
	use:enhance={() => {
		if (!validateForm()) {
			return ({ update }) => update();
		}
		
		isSubmitting = true;
		clearMessage();
		
		return async ({ result, update }) => {
			isSubmitting = false;
			
			if (result.type === 'success') {
				formMessage = 'Configuration saved successfully!';
				messageType = 'success';
				// Update the original values to reset hasUnsavedChanges
				user_facing_name = userFacingName;
				table_description = tableDescription;
				audit_logging_enabled = auditLoggingEnabled;
			} else if (result.type === 'failure') {
				formMessage = result.data?.message || 'Failed to save configuration. Please try again.';
				messageType = 'error';
			} else {
				formMessage = 'An unexpected error occurred. Please try again.';
				messageType = 'error';
			}
			
			await update();
		};
	}}
>
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-semibold">
			Edit Table Config: <code class="bg-muted px-2 py-1 rounded text-sm">{table}</code>
		</h1>
		<Button 
			variant="secondary" 
			type="button" 
			onclick={navigateBack}
			disabled={isSubmitting}
		>
			Back
		</Button>
	</div>

	{#if formMessage}
		<Alert class="mb-6" variant={messageType === 'error' ? 'destructive' : 'default'}>
			<AlertDescription>{formMessage}</AlertDescription>
		</Alert>
	{/if}

	<Card class="mb-6">
		<CardContent class="space-y-4 pt-6">
			<div>
				<label class="text-sm font-medium" for="user_facing_name">
					User Facing Table Name *
				</label>
				<div class:border-destructive={validationErrors.userFacingName}>
					<Input 
						id="user_facing_name"
						bind:value={userFacingName} 
						name="user_facing_name"
						aria-describedby={validationErrors.userFacingName ? "user_facing_name_error" : undefined}
						disabled={isSubmitting}
					/>
				</div>
				{#if validationErrors.userFacingName}
					<p id="user_facing_name_error" class="text-sm text-destructive mt-1">
						{validationErrors.userFacingName}
					</p>
				{/if}
			</div>
			
			<div>
				<label class="text-sm font-medium" for="table_description">
					Table Description *
				</label>
				<div class:border-destructive={validationErrors.tableDescription}>
					<Textarea 
						id="table_description"
						bind:value={tableDescription} 
						name="table_description"
						aria-describedby={validationErrors.tableDescription ? "table_description_error" : undefined}
						disabled={isSubmitting}
					/>
				</div>
				{#if validationErrors.tableDescription}
					<p id="table_description_error" class="text-sm text-destructive mt-1">
						{validationErrors.tableDescription}
					</p>
				{/if}
			</div>
			
			<div class="flex items-center space-x-2">
				<Switch
					id="audit_logging_enabled"
					bind:checked={auditLoggingEnabled}
					name="audit_logging_enabled"
					disabled={isSubmitting}
				/>
				<label for="audit_logging_enabled" class="text-sm cursor-pointer">
					Enable Audit Log
				</label>
			</div>
		</CardContent>
	</Card>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		<Card class="col-span-1">
			<CardHeader>
				<CardTitle>Columns ({columnList.length})</CardTitle>
			</CardHeader>
			<CardContent class="space-y-1">
				{#each columnList as col, index (col.id)}
					<div
						role="button"
						tabindex="0"
						data-column-index={index}
						class="cursor-pointer rounded px-3 py-2 transition-colors hover:bg-muted focus:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
						class:bg-primary={selectedColumn?.id === col.id}
						class:text-primary-foreground={selectedColumn?.id === col.id}
						onclick={() => selectColumn(col, index)}
						onkeydown={(e) => handleKeyNavigation(e, col, index)}
						aria-label={`Select column ${col.user_facing_label || col.column_name}`}
					>
						<div class="flex items-center justify-between">
							<div class="flex-1 min-w-0">
								<span class="font-medium truncate block">
									{col.user_facing_label || col.column_name}
								</span>
								<code class="text-xs text-muted-foreground block truncate">
									[{col.column_name}]
								</code>
							</div>
							{#if !col.include_in_forms}
								<span class="text-xs bg-muted px-2 py-1 rounded ml-2 shrink-0">
									Hidden
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</CardContent>
		</Card>

		<Card class="col-span-2">
			<CardHeader>
				<CardTitle>
					Edit Column: 
					<code class="bg-muted px-2 py-1 rounded text-sm">
						{selectedColumn?.column_name}
					</code>
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if selectedColumn}
					<Input
						type="hidden"
						name={`col_${selectedColumn.index}_column_name`}
						value={selectedColumn.column_name}
					/>

					<div>
						<label class="text-sm font-medium" for={`col_${selectedColumn.index}_user_facing_label`}>
							User Facing Label {selectedColumn.include_in_forms ? '*' : ''}
						</label>
						<div class:border-destructive={validationErrors[`col_${selectedColumn.index}_user_facing_label`]}>
							<Input
								id={`col_${selectedColumn.index}_user_facing_label`}
								name={`col_${selectedColumn.index}_user_facing_label`}
								bind:value={selectedColumn.user_facing_label}
								aria-describedby={validationErrors[`col_${selectedColumn.index}_user_facing_label`] ? `col_${selectedColumn.index}_user_facing_label_error` : undefined}
								disabled={isSubmitting}
							/>
						</div>
						{#if validationErrors[`col_${selectedColumn.index}_user_facing_label`]}
							<p id={`col_${selectedColumn.index}_user_facing_label_error`} class="text-sm text-destructive mt-1">
								{validationErrors[`col_${selectedColumn.index}_user_facing_label`]}
							</p>
						{/if}
					</div>

					<div>
						<label class="text-sm font-medium" for={`col_${selectedColumn.index}_help_text`}>
							Help Text
						</label>
						<Textarea
							id={`col_${selectedColumn.index}_help_text`}
							name={`col_${selectedColumn.index}_help_text`}
							bind:value={selectedColumn.help_text}
							placeholder="Optional help text to guide users"
							disabled={isSubmitting}
						/>
					</div>

					<div class="flex items-center space-x-2">
						<Switch
							id={`col_${selectedColumn.index}_include_in_forms`}
							name={`col_${selectedColumn.index}_include_in_forms`}
							bind:checked={selectedColumn.include_in_forms}
							disabled={isSubmitting}
						/>
						<label for={`col_${selectedColumn.index}_include_in_forms`} class="text-sm cursor-pointer">
							Include in forms
						</label>
					</div>

					{#if selectedColumn.include_in_forms}
						<div>
							<label class="text-sm font-medium" for={`col_${selectedColumn.index}_tally_field_type`}>
								Tally Field Type *
							</label>
							<div class:border-destructive={validationErrors[`col_${selectedColumn?.index}_tally_field_type`]}>
								<Select.Root
									type="single"
									name={`col_${selectedColumn?.index}_tally_field_type`}
									bind:value={selectedColumn.tally_field_type}
									disabled={isSubmitting}
								>
									<Select.Trigger>
										<Select.Value placeholder="Select a type" />
									</Select.Trigger>
									<Select.Content>
										{#each allowedMapping.options as opt}
											<Select.Item value={opt.value}>{opt.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
							{#if validationErrors[`col_${selectedColumn?.index}_tally_field_type`]}
								<p class="text-sm text-destructive mt-1">
									{validationErrors[`col_${selectedColumn?.index}_tally_field_type`]}
								</p>
							{/if}
						</div>

						{#if allowedMapping.extraFields.length > 0}
							<Separator class="my-4" />
							<div class="space-y-3">
								<h4 class="text-sm font-medium">Field Options</h4>
								{#each allowedMapping.extraFields as field}
									<div>
										<label class="text-sm font-medium" for={`col_${selectedColumn.index}_${field.name}`}>
											{field.label}
										</label>
										<Input
											id={`col_${selectedColumn.index}_${field.name}`}
											name={`col_${selectedColumn.index}_${field.name}`}
											type={field.type}
											value={selectedColumn.tally_specific_options?.[field.name] || ''}
											oninput={(e) => updateExtraField(field.name, e.target.value)}
											disabled={isSubmitting}
										/>
									</div>
								{/each}
							</div>
						{/if}
					{/if}

					<div class="mt-4 p-3 bg-muted rounded-lg">
						<p class="text-sm text-muted-foreground">
							<strong>Data Type:</strong> {selectedColumn.data_type}
						</p>
						{#if selectedColumn.is_nullable !== undefined}
							<p class="text-sm text-muted-foreground">
								<strong>Nullable:</strong> {selectedColumn.is_nullable ? 'Yes' : 'No'}
							</p>
						{/if}
					</div>
				{:else}
					<div class="text-center py-8 text-muted-foreground">
						<p>No column selected</p>
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>

	<input type="hidden" name="columnCount" value={columnList.length} />
	<input type="hidden" name="all_columns" value={JSON.stringify(columnList)} />

	<div class="mt-6 flex justify-between items-center">
		<div class="text-sm text-muted-foreground">
			{#if hasUnsavedChanges}
				<span class="text-orange-600">• Unsaved changes</span>
			{:else}
				<span class="text-green-600">• All changes saved</span>
			{/if}
		</div>
		
		<Button 
			type="submit" 
			formaction="?/updateConfig"
			disabled={isSubmitting}
			class="min-w-[140px]"
		>
			{#if isSubmitting}
				<svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				Saving...
			{:else}
				Save Configuration
			{/if}
		</Button>
	</div>
</form>

<style>
	.selected {
		@apply bg-primary text-primary-foreground;
	}
</style>