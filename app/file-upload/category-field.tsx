'use client';

import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { NativeButton } from '@/components/ui/upload';

export type Category = { id: string; name: string };

const byName = (a: Category, b: Category) =>
	a.name.toLowerCase().localeCompare(b.name.toLowerCase());

/** Choose a category from the shared list, or add a new one to it. */
export function CategoryField({
	value,
	onChange,
}: {
	value: Category | null;
	onChange: (category: Category | null) => void;
}) {
	const id = useId();
	const [categories, setCategories] = useState<Category[] | null>(null);
	const [loadFailed, setLoadFailed] = useState(false);
	const [loadAttempt, setLoadAttempt] = useState(0);
	const [adding, setAdding] = useState(false);
	const [newName, setNewName] = useState('');
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	// Loaded each time the form opens, to pick up categories other people added.
	useEffect(() => {
		const controller = new AbortController();
		fetch('/api/v1/categories', { signal: controller.signal })
			.then(async (response) => {
				if (!response.ok) throw new Error('Could not load categories');
				const result = await response.json();
				setCategories(result.categories);
			})
			.catch(() => {
				if (!controller.signal.aborted) setLoadFailed(true);
			});
		return () => controller.abort();
	}, [loadAttempt]);

	async function addCategory() {
		setSaving(true);
		setSaveError(null);
		try {
			const response = await fetch('/api/v1/categories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newName }),
			});
			const result = await response.json();
			if (!response.ok) {
				setSaveError(result.error ?? 'Could not save the category');
				return;
			}
			const added: Category = result.category;
			setCategories((current) =>
				[
					...(current ?? []).filter((category) => category.id !== added.id),
					added,
				].sort(byName),
			);
			onChange(added);
			setNewName('');
			setAdding(false);
		} catch {
			setSaveError('Could not reach the server. Please try again.');
		} finally {
			setSaving(false);
		}
	}

	function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		// Enter adds the category rather than submitting the whole review form.
		if (event.key !== 'Enter') return;
		event.preventDefault();
		if (newName.trim() && !saving) void addCategory();
	}

	if (loadFailed) {
		return (
			<div className="flex flex-col gap-1.5">
				<Label>Category</Label>
				<p
					role="alert"
					className="flex flex-wrap items-center gap-2 text-sm text-destructive"
				>
					Couldn&apos;t load categories.
					<NativeButton
						variant="outline"
						size="sm"
						onClick={() => {
							setLoadFailed(false);
							setLoadAttempt((attempt) => attempt + 1);
						}}
					>
						Try again
					</NativeButton>
				</p>
			</div>
		);
	}

	if (adding) {
		return (
			<div className="flex flex-col gap-1.5">
				<Label htmlFor={id}>New category</Label>
				<div className="flex flex-wrap items-center gap-2">
					<Input
						id={id}
						autoFocus
						value={newName}
						maxLength={100}
						autoComplete="off"
						className="min-w-40 flex-1"
						onChange={(event) => setNewName(event.target.value)}
						onKeyDown={handleNameKeyDown}
					/>
					<NativeButton
						disabled={!newName.trim() || saving}
						onClick={() => void addCategory()}
					>
						{saving ? 'Adding…' : 'Add'}
					</NativeButton>
					<NativeButton
						variant="outline"
						onClick={() => {
							setAdding(false);
							setNewName('');
							setSaveError(null);
						}}
					>
						Cancel
					</NativeButton>
				</div>
				{saveError && (
					<p role="alert" className="text-xs text-destructive">
						{saveError}
					</p>
				)}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor={id}>Category</Label>
			<div className="flex flex-wrap items-center gap-2">
				<NativeSelect
					id={id}
					className="min-w-40 flex-1"
					disabled={!categories}
					value={value?.id ?? ''}
					onChange={(event) =>
						onChange(
							categories?.find(
								(category) => category.id === event.target.value,
							) ?? null,
						)
					}
				>
					<NativeSelectOption value="">
						{!categories
							? 'Loading…'
							: categories.length
								? 'Select a category'
								: 'No categories yet'}
					</NativeSelectOption>
					{categories?.map((category) => (
						<NativeSelectOption key={category.id} value={category.id}>
							{category.name}
						</NativeSelectOption>
					))}
				</NativeSelect>
				<NativeButton variant="outline" onClick={() => setAdding(true)}>
					New category
				</NativeButton>
			</div>
		</div>
	);
}
