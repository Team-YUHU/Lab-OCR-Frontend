'use client';

import { useState } from 'react';
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
import type { Fields } from '@/features/labels/lib/label-csv';
import { uploadVialMedia, type UploadedMedia } from '@/features/labels/lib/upload-media';
import { mergeFrameResults, type FrameResult } from '@/features/labels/lib/label-merge';
import type { Category } from '@/features/labels/components/category-field';
import {
	ReviewForm,
	type Alternatives,
	type VialDetails,
} from '@/features/labels/components/review-form';
import {
	extractScoredFrames,
	isVideoFile,
	sharpestFrame,
	stillFromVideo,
} from '@/features/labels/lib/video-frames';

const ACCEPT =
	'image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime,.mov,.m4v';
const MAX_BYTES = 50 * 1024 * 1024; // matches the OCR route's limit
const MAX_FILES = 20;

// Files stay in the browser and only go to the OCR route. Confirmed values go to the database.
const adapter = localAdapter();

type LabelRead = {
	fields: Fields;
	alternatives: Alternatives;
	labelType: string | null;
	/** Which project the vial belongs to, or null for uncategorized. Not a CSV column. */
	category: Category | null;
	/** The saved row, once confirmed. Editing updates it rather than adding another. */
	vialId: string | null;
	/** When the label was read, as an ISO timestamp. */
	scannedAt: string;
	/** Optional name and description. Not CSV columns. */
	details: VialDetails;
	/** What gets kept in Cloudinary: the photo itself, or a video's sharpest frame. */
	still: File;
	/** That still's copy in Cloudinary, once uploaded. Kept so a retry doesn't upload it twice. */
	media: UploadedMedia | null;
};

/** Saves a confirmed label and returns the vial's id. Throws with a message to show. */
async function saveVial(
	item: UploadItemData,
	label: LabelRead,
	fields: Fields,
	category: Category | null,
	details: VialDetails,
	media: UploadedMedia | null,
): Promise<string> {
	const { vialId, labelType, scannedAt } = label;
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
				name: details.name,
				description: details.description,
				scannedAt,
				// Only a new vial takes media; an edit keeps what it has.
				media: vialId ? undefined : media,
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
	const frames = isVideo ? await extractScoredFrames(file) : [];
	const images: Blob[] = isVideo ? frames.map(({ frame }) => frame) : [file];

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
		scannedAt: new Date().toISOString(),
		details: { name: '', description: '' },
		still: isVideo ? stillFromVideo(file, sharpestFrame(frames)) : file,
		media: null,
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
		return <CircleAlertIcon aria-hidden className='size-3 text-destructive' />;
	}
	if (status === 'confirmed') {
		return (
			<span
				aria-hidden
				className='flex size-3 items-center justify-center rounded-full bg-green-500 text-white'
			>
				<CheckIcon className='size-3' strokeWidth={3} />
			</span>
		);
	}
	const color = {
		queued: 'border-red-700 bg-red-500',
		reading: 'border-yellow-600 bg-yellow-400',
		ready: 'border-green-700 bg-green-500',
	}[status];
	return (
		<span
			aria-hidden
			className={`size-2 shrink-0 animate-pulse rounded-full border-[0.5px] motion-reduce:animate-none ${color}`}
		/>
	);
}

/** The photo, or the opening frame of the video. */
function Snapshot({ file }: { file: File }) {
	const url = useFilePreview(file, { thumbnailSize: 256 });
	const [unplayable, setUnplayable] = useState(false);
	const className = 'size-full object-contain';

	let content = <UploadFileIcon className='size-6 text-muted-foreground' />;
	if (url && !isVideoFile(file)) {
		// A local blob preview, so next/image's optimization doesn't apply.
		// eslint-disable-next-line @next/next/no-img-element
		content = <img src={url} alt='' className={className} />;
	} else if (url && !unplayable) {
		content = (
			<video
				src={`${url}#t=0.1`}
				muted
				playsInline
				preload='metadata'
				aria-hidden
				onError={() => setUnplayable(true)}
				className={className}
			/>
		);
	}

	return (
		<div className='flex aspect-4/3 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted sm:w-28'>
			{content}
		</div>
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
				variant='ghost'
				size='icon-xs'
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
					<NativeButton variant='outline' onClick={() => setOpen(false)}>
						Cancel
					</NativeButton>
					<NativeButton
						variant='destructive'
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

	async function handleConfirm(
		fields: Fields,
		category: Category | null,
		details: VialDetails,
	) {
		if (!label) return;

		// Keep a copy of the original file the first time it's saved. If that fails,
		// the label values still save: they matter more than the recording.
		let media = label.media;
		let mediaError: string | null = null;
		if (!label.vialId && !media) {
			try {
				media = await uploadVialMedia(label.still);
				uploader.update(item.id, { meta: { label: { ...label, media } } });
			} catch (error) {
				mediaError = (error as Error).message;
			}
		}

		const vialId = await saveVial(item, label, fields, category, details, media);
		uploader.update(item.id, {
			meta: {
				label: {
					...label,
					fields,
					alternatives: {},
					category,
					vialId,
					details,
					media,
				},
				confirmed: true,
			},
		});
		setOpen(false);
		if (mediaError) {
			toast.warning('Label saved without its photo', {
				description: `The photo of ${item.file.name} couldn't be stored: ${mediaError}`,
			});
		}
		toast.success('Label confirmed', {
			description: item.file.name,
			action: (
				<Link
					href='/inventory'
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
			className='grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl p-3 sm:gap-4 sm:p-4'
		>
			<StatusDot status={status} />
			<Snapshot file={item.file} />

			<div className='flex min-w-0 flex-col items-center gap-1 text-center'>
				<p
					aria-live='polite'
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
					className='w-full truncate text-xs text-muted-foreground'
				>
					{item.file.name}
				</p>
			</div>

			<div className='flex items-center gap-1'>
				<NativeButton
					variant='outline'
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
						file={item.file}
						previewUrl={(item.result as LocalUploadResult).url}
						fields={label.fields}
						alternatives={label.alternatives}
						category={label.category}
						details={label.details}
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
			className='flex flex-col gap-4'
		>
			<UploadDropzone>
				<UploadDropzoneHeader>
					<UploadDropzoneMedia variant='icon'>
						<ScanTextIcon />
					</UploadDropzoneMedia>
					<UploadDropzoneTitle>Drop label photos or videos</UploadDropzoneTitle>
					<UploadDropzoneDescription>
						Labels are read one at a time, in the order you add them
					</UploadDropzoneDescription>
				</UploadDropzoneHeader>
			</UploadDropzone>
			<UploadList filter={isVisible} className='gap-3'>
				{(item) => <LabelRow key={item.id} item={item} />}
			</UploadList>
		</Upload>
	);
}
