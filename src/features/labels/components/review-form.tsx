'use client';

import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	NativeButton,
	UploadModalDescription,
	UploadModalFooter,
	UploadModalHeader,
	UploadModalTitle,
} from '@/components/ui/upload';
import { CSV_COLUMNS, todayLocal, type FieldName, type Fields } from '@/features/labels/lib/label-csv';
import { CategoryField, type Category } from './category-field';
import { isVideoFile } from '@/features/labels/lib/video-frames';

export type Alternatives = Partial<Record<FieldName, string[]>>;

/** Optional details people add to a vial. Not CSV columns. */
export type VialDetails = { name: string; description: string };

/** The review step for one read label. Render it inside an `<UploadModal>`. */
export function ReviewForm({
	file,
	previewUrl,
	fields: initialFields,
	alternatives = {},
	category: initialCategory,
	details: initialDetails = { name: '', description: '' },
	onCancel,
	onConfirm,
}: {
	file: File;
	previewUrl: string;
	fields: Fields;
	alternatives?: Alternatives;
	category: Category | null;
	details?: VialDetails;
	onCancel: () => void;
	onConfirm: (
		fields: Fields,
		category: Category | null,
		details: VialDetails,
	) => Promise<void>;
}) {
	const [fields, setFields] = useState<Fields>({
		...initialFields,
		dateReceived: initialFields.dateReceived || todayLocal(),
	});
	const [category, setCategory] = useState(initialCategory);
	const [details, setDetails] = useState(initialDetails);
	const [addingCategory, setAddingCategory] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const isVideo = isVideoFile(file);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (addingCategory || saving) return;
		setSaving(true);
		setSaveError(null);
		try {
			await onConfirm(fields, category, {
				name: details.name.trim(),
				description: details.description.trim(),
			});
		} catch (error) {
			setSaveError((error as Error).message);
			setSaving(false);
		}
	}

	return (
		<>
			<UploadModalHeader>
				<UploadModalTitle>Review label</UploadModalTitle>
				<UploadModalDescription>
					Check each value against the {isVideo ? 'video' : 'photo'} and correct
					any mistakes.
				</UploadModalDescription>
			</UploadModalHeader>

			{isVideo ? (
				<video
					src={previewUrl}
					controls
					muted
					playsInline
					aria-label={`Video of ${file.name}`}
					className="max-h-56 w-full rounded-lg border"
				/>
			) : (
				// A local blob preview, so next/image's optimization doesn't apply.
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={previewUrl}
					alt={`Photo of ${file.name}`}
					className="max-h-56 w-full rounded-lg border object-contain"
				/>
			)}

			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				<CategoryField
					value={category}
					onChange={setCategory}
					adding={addingCategory}
					onAddingChange={setAddingCategory}
				/>
				<Label className="flex-col items-start gap-1.5">
					<span>
						Name{' '}
						<span className="font-normal text-muted-foreground">(optional)</span>
					</span>
					<Input
						value={details.name}
						maxLength={100}
						autoComplete="off"
						placeholder="e.g. Pump 3 weekly sample"
						onChange={(event) =>
							setDetails({ ...details, name: event.target.value })
						}
					/>
				</Label>
				<Label className="flex-col items-start gap-1.5">
					<span>
						Description{' '}
						<span className="font-normal text-muted-foreground">(optional)</span>
					</span>
					<textarea
						value={details.description}
						maxLength={1000}
						rows={2}
						placeholder="Notes about this vial"
						onChange={(event) =>
							setDetails({ ...details, description: event.target.value })
						}
						className="w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base font-normal transition-colors outline-none md:text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
					/>
				</Label>
				<p className="text-xs text-muted-foreground">
					Name and description are kept in the inventory, not the CSV.
				</p>
				<div className="grid gap-3 sm:grid-cols-2">
					{CSV_COLUMNS.map(({ name, label: fieldLabel }) => (
						<Label key={name} className="flex-col items-start gap-1.5">
							{fieldLabel}
							<Input
								value={fields[name] ?? ''}
								autoComplete="off"
								className="font-mono"
								onChange={(event) =>
									setFields({ ...fields, [name]: event.target.value })
								}
							/>
							{alternatives[name] && (
								<span className="text-xs leading-normal font-normal text-amber-700 dark:text-amber-400">
									Video frames disagreed. Also read:{' '}
									{alternatives[name].join(', ')}
								</span>
							)}
						</Label>
					))}
				</div>
				{saveError && (
					<p role="alert" className="text-sm text-destructive">
						{saveError}
					</p>
				)}
				<UploadModalFooter>
					<NativeButton variant="outline" onClick={onCancel}>
						Cancel
					</NativeButton>
					{/* Disabled mid-add, so a half-typed category can't save as uncategorized. */}
					<NativeButton type="submit" disabled={addingCategory || saving}>
						{saving ? 'Saving…' : 'Confirm'}
					</NativeButton>
				</UploadModalFooter>
			</form>
		</>
	);
}
