'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
	localAdapter,
	type LocalUploadResult,
	type ProcessContext,
	type UploadItem as UploadItemData,
} from '@uploadcn/core';
import { useFilePreview, useUploadContext } from '@uploadcn/react';
import { CheckIcon, CircleAlertIcon, ScanTextIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	NativeButton,
	Upload,
	UploadDropzone,
	UploadDropzoneDescription,
	UploadDropzoneHeader,
	UploadDropzoneMedia,
	UploadDropzoneTitle,
	UploadFileIcon,
	UploadItem,
	UploadItemRemove,
	UploadItemRetry,
	UploadList,
	UploadModal,
	UploadModalDescription,
	UploadModalFooter,
	UploadModalHeader,
	UploadModalTitle,
} from '@/components/ui/upload';
import { UNCATEGORIZED_NAME } from '@/lib/categories';
import {
	CSV_COLUMNS,
	todayLocal,
	type FieldName,
	type Fields,
} from '../label-csv';
import { mergeFrameResults, type FrameResult } from '../label-merge';
import { CategoryField, type Category } from './category-field';
import { extractFrames, isVideoFile } from '../video-frames';

const ACCEPT =
	'image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime,.mov,.m4v';
const MAX_BYTES = 50 * 1024 * 1024; // matches the OCR route's limit
const MAX_FILES = 20;

// Files stay in the browser and only go to the OCR route. Confirmed values go to the database.
const adapter = localAdapter();

type Alternatives = Partial<Record<FieldName, string[]>>;
type LabelRead = {
	fields: Fields;
	alternatives: Alternatives;
	labelType: string | null;
	/** Which project the vial belongs to, or null for uncategorized. Not a CSV column. */
	category: Category | null;
	/** The saved row, once confirmed. Editing updates it rather than adding another. */
	vialId: string | null;
};

/** Saves a confirmed label and returns the vial's id. Throws with a message to show. */
async function saveVial(
	item: UploadItemData,
	label: LabelRead,
	fields: Fields,
	category: Category | null,
): Promise<string> {
	const { vialId, labelType } = label;
	let response: Response;
	try {
		response = await fetch(`/api/v1/vials${vialId ? `/${vialId}` : ''}`, {
			method: vialId ? 'PUT' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				categoryId: category?.id ?? null,
				fields,
				labelType,
				fileName: item.file.name.slice(0, 255),
			}),
		});
	} catch {
		throw new Error('Could not reach the server. Please try again.');
	}
	const result = await response.json().catch(() => null);
	if (!response.ok) throw new Error(result?.error ?? 'Could not save the vial');
	return result.vial.id;
}

/** Reads a label through the OCR route. */
async function readLabel(file: File, signal: AbortSignal): Promise<LabelRead> {
	const isVideo = isVideoFile(file);
	const images: Blob[] = isVideo ? await extractFrames(file) : [file];

	const results: FrameResult[] = [];
	let lastError: string | null = null;

	// One at a time, because a local model works through them one by one anyway.
	for (const [index, image] of images.entries()) {
		const body = new FormData();
		body.append('image', image, isVideo ? `frame-${index + 1}.jpg` : file.name);

		const response = await fetch('/api/v1/ocr', {
			method: 'POST',
			body,
			signal,
		});
		const result = await response.json();

		if (response.ok) results.push(result);
		else lastError = result.error;
	}

	if (results.length === 0) {
		throw new Error(lastError ?? 'Could not read the label');
	}

	const { fields, alternatives, labelType } = mergeFrameResults(results);
	return {
		fields: { ...fields, dateReceived: '' },
		alternatives,
		labelType,
		category: null,
		vialId: null,
	};
}

let lastInQueue: Promise<unknown> = Promise.resolve();

/**
 * Reads one file at a time, in the order they were added. The uploader's own
 * queue doesn't cover this: it frees a slot as soon as the upload step ends.
 */
function readInTurn(item: UploadItemData, context: ProcessContext<unknown>) {
	context.setMeta({ waiting: true });

	const turn = lastInQueue.then(async () => {
		context.signal.throwIfAborted();
		context.setMeta({ waiting: false });
		context.setMeta({ label: await readLabel(item.file, context.signal) });
	});
	// A failed read belongs to its own file and shouldn't stop the ones behind it.
	lastInQueue = turn.catch(() => {});
	return turn.then(() => undefined);
}

type RowStatus = 'queued' | 'reading' | 'ready' | 'confirmed' | 'failed';

const STATUS_TEXT: Record<Exclude<RowStatus, 'failed'>, string> = {
	queued: 'Queued',
	reading: 'Reading…',
	ready: 'Ready to confirm',
	confirmed: 'Confirmed',
};

function getRowStatus(item: UploadItemData): RowStatus {
	if (item.status === 'error' || item.status === 'rejected') return 'failed';
	if (item.status === 'success') {
		return item.meta.confirmed ? 'confirmed' : 'ready';
	}
	return item.status === 'processing' && !item.meta.waiting
		? 'reading'
		: 'queued';
}

function StatusDot({ status }: { status: RowStatus }) {
	if (status === 'failed') {
		return <CircleAlertIcon aria-hidden className="size-6 text-destructive" />;
	}
	if (status === 'confirmed') {
		return (
			<span
				aria-hidden
				className="flex size-6 items-center justify-center rounded-full bg-green-500 text-white"
			>
				<CheckIcon className="size-4" strokeWidth={3} />
			</span>
		);
	}
	const color = {
		queued: 'bg-red-500',
		reading: 'animate-pulse bg-yellow-400 motion-reduce:animate-none',
		ready: 'bg-green-500',
	}[status];
	return <span aria-hidden className={`size-6 rounded-full ${color}`} />;
}

/** The photo, or the opening frame of the video. */
function Snapshot({ file }: { file: File }) {
	const url = useFilePreview(file, { thumbnailSize: 256 });
	const [unplayable, setUnplayable] = useState(false);
	const className = 'size-full object-contain';

	let content = <UploadFileIcon className="size-6 text-muted-foreground" />;
	if (url && !isVideoFile(file)) {
		// A local blob preview, so next/image's optimization doesn't apply.
		// eslint-disable-next-line @next/next/no-img-element
		content = <img src={url} alt="" className={className} />;
	} else if (url && !unplayable) {
		content = (
			<video
				src={`${url}#t=0.1`}
				muted
				playsInline
				preload="metadata"
				aria-hidden
				onError={() => setUnplayable(true)}
				className={className}
			/>
		);
	}

	return (
		<div className="flex aspect-4/3 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted sm:w-28">
			{content}
		</div>
	);
}

function ReviewForm({
	item,
	label,
	onCancel,
	onConfirm,
}: {
	item: UploadItemData;
	label: LabelRead;
	onCancel: () => void;
	onConfirm: (fields: Fields, category: Category | null) => Promise<void>;
}) {
	const [fields, setFields] = useState<Fields>({
		...label.fields,
		dateReceived: label.fields.dateReceived || todayLocal(),
	});
	const [category, setCategory] = useState(label.category);
	const [addingCategory, setAddingCategory] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const previewUrl = (item.result as LocalUploadResult).url;

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (addingCategory || saving) return;
		setSaving(true);
		setSaveError(null);
		try {
			await onConfirm(fields, category);
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
					Check each value against the {isVideoFile(item.file) ? 'video' : 'photo'}{' '}
					and correct any mistakes.
				</UploadModalDescription>
			</UploadModalHeader>

			{isVideoFile(item.file) ? (
				<video
					src={previewUrl}
					controls
					muted
					playsInline
					aria-label={`Video of ${item.file.name}`}
					className="max-h-56 w-full rounded-lg border"
				/>
			) : (
				// A local blob preview, so next/image's optimization doesn't apply.
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={previewUrl}
					alt={`Photo of ${item.file.name}`}
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
				<div className="grid gap-3 sm:grid-cols-2">
					{CSV_COLUMNS.map(({ name, label: fieldLabel }) => (
						<Label key={name} className="flex-col items-start gap-1.5">
							{fieldLabel}
							<Input
								value={fields[name]}
								autoComplete="off"
								className="font-mono"
								onChange={(event) =>
									setFields({ ...fields, [name]: event.target.value })
								}
							/>
							{label.alternatives[name] && (
								<span className="text-xs leading-normal font-normal text-amber-700 dark:text-amber-400">
									Video frames disagreed. Also read:{' '}
									{label.alternatives[name].join(', ')}
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

/** The ✕ on a saved vial: deletes it from the database, then removes the row. */
function DeleteVial({
	item,
	vialId,
}: {
	item: UploadItemData;
	vialId: string;
}) {
	const { uploader } = useUploadContext();
	const [open, setOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	async function handleDelete() {
		setDeleting(true);
		try {
			const response = await fetch(`/api/v1/vials/${vialId}`, {
				method: 'DELETE',
			});
			// 404 means it's already gone, which is what was asked for.
			if (!response.ok && response.status !== 404) throw new Error();
			uploader.remove(item.id);
			toast.success('Vial deleted', { description: item.file.name });
		} catch {
			setOpen(false);
			setDeleting(false);
			toast.error('Could not delete the vial', {
				description: `${item.file.name} is still saved. Please try again.`,
			});
		}
	}

	return (
		<>
			<NativeButton
				variant="ghost"
				size="icon-xs"
				aria-label={`Delete ${item.file.name}`}
				onClick={() => setOpen(true)}
			>
				<XIcon />
			</NativeButton>
			<UploadModal open={open} onOpenChange={setOpen}>
				<UploadModalHeader>
					<UploadModalTitle>Delete this vial?</UploadModalTitle>
					<UploadModalDescription>
						{item.file.name} will be permanently removed from the database. This
						can&apos;t be undone.
					</UploadModalDescription>
				</UploadModalHeader>
				<UploadModalFooter>
					<NativeButton variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</NativeButton>
					<NativeButton
						variant="destructive"
						disabled={deleting}
						onClick={() => void handleDelete()}
					>
						{deleting ? 'Deleting…' : 'Delete'}
					</NativeButton>
				</UploadModalFooter>
			</UploadModal>
		</>
	);
}

function LabelRow({ item }: { item: UploadItemData }) {
	const { uploader } = useUploadContext();
	const [open, setOpen] = useState(false);
	const status = getRowStatus(item);
	const label = item.meta.label as LabelRead | undefined;
	const canReview = status === 'ready' || status === 'confirmed';
	const statusText =
		status === 'failed'
			? (item.issues[0]?.message ??
				item.error?.message ??
				'Could not read the label')
			: status === 'confirmed'
				? `Confirmed · ${label?.category?.name ?? UNCATEGORIZED_NAME}`
				: STATUS_TEXT[status];

	async function handleConfirm(fields: Fields, category: Category | null) {
		if (!label) return;
		const vialId = await saveVial(item, label, fields, category);
		uploader.update(item.id, {
			meta: {
				label: { ...label, fields, alternatives: {}, category, vialId },
				confirmed: true,
			},
		});
		setOpen(false);
		toast.success('Label confirmed', {
			description: item.file.name,
			action: (
				<Link
					href="/inventory"
					className={buttonVariants({ size: 'sm', className: 'ms-auto' })}
				>
					View inventory
				</Link>
			),
		});
	}

	return (
		<UploadItem
			item={item}
			className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 rounded-3xl p-3 sm:gap-4 sm:p-4"
		>
			<Snapshot file={item.file} />

			<div className="flex min-w-0 flex-col items-center gap-1 text-center">
				<StatusDot status={status} />
				<p
					aria-live="polite"
					className={
						status === 'failed'
							? 'line-clamp-2 text-xs font-medium text-destructive'
							: 'text-xs font-medium'
					}
				>
					{statusText}
				</p>
				<p
					title={item.file.name}
					className="w-full truncate text-xs text-muted-foreground"
				>
					{item.file.name}
				</p>
			</div>

			<div className="flex items-center gap-1">
				<NativeButton
					variant="outline"
					disabled={!canReview}
					onClick={() => setOpen(true)}
					className={
						status === 'confirmed'
							? undefined
							: 'border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-950 dark:hover:text-green-300'
					}
				>
					{status === 'confirmed' ? 'Edit' : 'Confirm'}
				</NativeButton>
				<UploadItemRetry />
				{label?.vialId ? (
					<DeleteVial item={item} vialId={label.vialId} />
				) : (
					<UploadItemRemove />
				)}
			</div>

			{label && (
				<UploadModal open={open} onOpenChange={setOpen}>
					<ReviewForm
						item={item}
						label={label}
						onCancel={() => setOpen(false)}
						onConfirm={handleConfirm}
					/>
				</UploadModal>
			)}
		</UploadItem>
	);
}

const isVisible = (item: UploadItemData) => item.status !== 'cancelled';

export function LabelUpload() {
	return (
		<Upload
			adapter={adapter}
			accept={ACCEPT}
			maxSize={MAX_BYTES}
			maxFiles={MAX_FILES}
			process={readInTurn}
			className="flex flex-col gap-4"
		>
			<UploadDropzone>
				<UploadDropzoneHeader>
					<UploadDropzoneMedia variant="icon">
						<ScanTextIcon />
					</UploadDropzoneMedia>
					<UploadDropzoneTitle>Drop label photos or videos</UploadDropzoneTitle>
					<UploadDropzoneDescription>
						Labels are read one at a time, in the order you add them
					</UploadDropzoneDescription>
				</UploadDropzoneHeader>
			</UploadDropzone>
			<UploadList filter={isVisible} className="gap-3">
				{(item) => <LabelRow key={item.id} item={item} />}
			</UploadList>
		</Upload>
	);
}
