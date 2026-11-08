'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { buttonVariants } from '@/components/ui/button';
import { UploadModal } from '@/components/ui/upload';
import { UNCATEGORIZED_NAME } from '@/lib/categories';
import type { Fields } from '@/features/labels/lib/label-csv';
import type { Category } from '@/features/labels/components/category-field';
import { uploadVialMedia, type UploadedMedia } from '@/features/labels/lib/upload-media';
import {
	extractScoredFrames,
	sharpestFrame,
	stillFromVideo,
} from '@/features/labels/lib/video-frames';
import { ReviewForm, type VialDetails } from '@/features/labels/components/review-form';

// Plain types, because the OCR route rejects any type with a codecs suffix.
// iOS Safari only records MP4.
const RECORDING_FORMATS = [
	{ type: 'video/webm', extension: 'webm' },
	{ type: 'video/mp4', extension: 'mp4' },
];

type Phase = 'starting' | 'ready' | 'recording' | 'uploading' | 'done';
/** scannedAt is when the label was read, as an ISO timestamp. */
type OcrResult = { labelType: string | null; fields: Fields; scannedAt: string };
type Saved = { vialId: string; category: Category | null };

function cameraErrorMessage(caught: unknown) {
	const name = caught instanceof Error ? caught.name : '';
	if (name === 'NotAllowedError' && window.isSecureContext) {
		return 'Camera access was blocked. Allow the camera in your browser settings, then reload this page.';
	}
	if (name === 'NotFoundError') return 'No camera was found on this device.';
	if (!window.isSecureContext) {
		return 'The camera only works over HTTPS. Open this page using an https:// address.';
	}
	return 'Could not start the camera. Close any other app using it, then reload this page.';
}

function formatElapsed(seconds: number) {
	const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
	return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function CameraCapture() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const recorderRef = useRef<MediaRecorder | null>(null);
	/** The current recording's sharpest frame, started as soon as recording stops. */
	const stillRef = useRef<{ file: File; still: Promise<File> } | null>(null);
	/** That frame's copy in Cloudinary, once uploaded. */
	const uploadedRef = useRef<{ file: File; media: UploadedMedia } | null>(null);

	const [phase, setPhase] = useState<Phase>('starting');
	const [recording, setRecording] = useState<File | null>(null);
	const [elapsed, setElapsed] = useState(0);
	const [cameraError, setCameraError] = useState<string | null>(null);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [result, setResult] = useState<OcrResult | null>(null);
	const [reviewing, setReviewing] = useState(false);
	const [saved, setSaved] = useState<Saved | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function startCamera() {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: false,
					// The rear camera at high resolution, so small label text stays readable.
					video: {
						facingMode: { ideal: 'environment' },
						width: { ideal: 1920 },
						height: { ideal: 1080 },
					},
				});
				if (cancelled) {
					stream.getTracks().forEach((track) => track.stop());
					return;
				}
				streamRef.current = stream;
				if (videoRef.current) videoRef.current.srcObject = stream;
				setPhase('ready');
			} catch (caught) {
				if (!cancelled) setCameraError(cameraErrorMessage(caught));
			}
		}

		startCamera();

		return () => {
			cancelled = true;
			// Leaving the page mid-recording discards it rather than uploading it.
			if (recorderRef.current) recorderRef.current.onstop = null;
			streamRef.current?.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (phase !== 'recording') return;
		const startedAt = Date.now();
		const timer = setInterval(
			() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
			250,
		);
		return () => clearInterval(timer);
	}, [phase]);

	async function upload(file: File) {
		setPhase('uploading');
		setUploadError(null);

		try {
			const body = new FormData();
			body.append('video', file);
			const response = await fetch('/api/v1/ocr', { method: 'POST', body });
			const data = await response.json();

			if (response.ok) {
				setResult({ ...data, scannedAt: new Date().toISOString() });
				setReviewing(true);
			} else {
				setUploadError(data.error ?? 'Could not read the label.');
			}
		} catch {
			setUploadError('Could not reach the server. Please try again.');
		} finally {
			setPhase('done');
		}
	}

	function startRecording() {
		const stream = streamRef.current;
		if (!stream) return;

		const format = RECORDING_FORMATS.find(({ type }) =>
			MediaRecorder.isTypeSupported(type),
		);
		if (!format) {
			setCameraError('This browser cannot record video.');
			return;
		}

		const chunks: Blob[] = [];
		const recorder = new MediaRecorder(stream, { mimeType: format.type });
		recorder.ondataavailable = (event) => {
			if (event.data.size > 0) chunks.push(event.data);
		};
		recorder.onstop = () => {
			const file = new File(chunks, `recording.${format.extension}`, {
				type: format.type,
			});
			if (file.size === 0) {
				setUploadError('The recording was empty. Please record again.');
				setPhase('done');
				return;
			}
			setRecording(file);
			upload(file);
			// Only a still frame is kept, not the video. Picked while the label is being read.
			const still = extractScoredFrames(file).then((frames) =>
				stillFromVideo(file, sharpestFrame(frames)),
			);
			still.catch(() => {}); // Reported when the label is saved, not here.
			stillRef.current = { file, still };
		};

		recorderRef.current = recorder;
		recorder.start();
		setElapsed(0);
		setPhase('recording');
	}

	async function saveToInventory(
		fields: Fields,
		category: Category | null,
		details: VialDetails,
	) {
		if (!result) return;

		// Keep the sharpest frame in Cloudinary. If that fails the label values still save.
		let media =
			recording && uploadedRef.current?.file === recording
				? uploadedRef.current.media
				: null;
		let mediaError: string | null = null;
		if (recording && !media) {
			try {
				const pending = stillRef.current;
				const still = await (pending?.file === recording
					? pending.still
					: extractScoredFrames(recording).then((frames) =>
							stillFromVideo(recording, sharpestFrame(frames)),
						));
				media = await uploadVialMedia(still);
				// Remembered so a failed save can retry without uploading again.
				uploadedRef.current = { file: recording, media };
			} catch (error) {
				mediaError = (error as Error).message;
			}
		}

		let response: Response;
		try {
			response = await fetch('/api/v1/vials', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					categoryId: category?.id ?? null,
					fields,
					labelType: result.labelType,
					fileName: recording?.name ?? null,
					name: details.name,
					description: details.description,
					scannedAt: result.scannedAt,
					media,
				}),
			});
		} catch {
			throw new Error('Could not reach the server. Please try again.');
		}
		const data = await response.json().catch(() => null);
		if (!response.ok) throw new Error(data?.error ?? 'Could not save the vial');
		setSaved({ vialId: data.vial.id, category });
		setReviewing(false);
		if (mediaError) {
			toast.warning('Label saved without its photo', {
				description: `A still from the video couldn't be stored: ${mediaError}`,
			});
		}
		toast.success('Label confirmed', {
			description: category?.name ?? UNCATEGORIZED_NAME,
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

	function recordAgain() {
		setRecording(null);
		setResult(null);
		setReviewing(false);
		setUploadError(null);
		setSaved(null);
		setElapsed(0);
		setPhase('ready');
	}

	const isRecording = phase === 'recording';
	const previewUrl = useMemo(
		() => (recording ? URL.createObjectURL(recording) : null),
		[recording],
	);
	useEffect(
		() => () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
		},
		[previewUrl],
	);

	return (
		<main className='fixed inset-0 z-50 flex flex-col bg-black text-white'>
			<video
				ref={videoRef}
				autoPlay
				muted
				playsInline
				aria-label='Camera viewfinder'
				className='absolute inset-0 h-full w-full object-cover'
			/>

			<div className='relative flex items-center justify-center p-4'>
				<Link
					href='/'
					aria-label='Close the camera'
					className='absolute left-4 flex size-10 items-center justify-center rounded-full bg-black/40 backdrop-blur hover:bg-black/60'
				>
					<XIcon className='size-5' aria-hidden />
				</Link>
				{(isRecording || phase === 'ready') && (
					<span
						role='timer'
						className={`rounded-full px-3 py-1 font-mono text-lg tabular-nums backdrop-blur ${
							isRecording ? 'bg-red-600' : 'bg-black/40'
						}`}
					>
						{formatElapsed(elapsed)}
					</span>
				)}
			</div>

			{cameraError && (
				<p role='alert' className='relative m-auto max-w-sm p-6 text-center'>
					{cameraError}
				</p>
			)}

			{!cameraError && (phase === 'ready' || isRecording) && (
				<div className='relative mt-auto flex justify-center bg-gradient-to-t from-black/70 to-transparent pt-12 pb-[calc(2rem+env(safe-area-inset-bottom))]'>
					<button
						type='button'
						onClick={() =>
							isRecording ? recorderRef.current?.stop() : startRecording()
						}
						aria-label={isRecording ? 'Stop recording' : 'Start recording'}
						className='flex size-20 items-center justify-center rounded-full border-4 border-white'
					>
						<span
							className={`bg-red-600 transition-all ${
								isRecording ? 'size-8 rounded-md' : 'size-16 rounded-full'
							}`}
						/>
					</button>
				</div>
			)}

			{phase === 'uploading' && (
				<div className='absolute inset-0 flex items-center justify-center bg-black/70'>
					<p role='status'>Reading the label…</p>
				</div>
			)}

			{phase === 'done' && (
				<div className='absolute inset-0 overflow-y-auto bg-background/95 text-foreground backdrop-blur'>
					<div className='mx-auto flex max-w-md flex-col gap-4 p-6'>
						{uploadError && (
							<p role='alert' className='text-destructive'>
								{uploadError}
							</p>
						)}

						{result && (
							<>
								<h1 className='text-xl font-semibold'>
									{saved
										? 'Saved to inventory'
										: result.labelType
											? `Read a ${result.labelType} label`
											: 'Label read'}
								</h1>

								{saved ? (
									<p
										role='status'
										className='flex items-center gap-2 rounded-3xl border bg-card px-5 py-4 text-sm'
									>
										<CheckIcon className='size-4 text-green-500' aria-hidden />
										Saved to {saved.category?.name ?? UNCATEGORIZED_NAME}.
										<Link
											href='/inventory'
											className='ms-auto font-medium underline-offset-4 hover:underline'
										>
											View inventory
										</Link>
									</p>
								) : (
									<p className='text-sm text-muted-foreground'>
										This label hasn&apos;t been saved yet.
									</p>
								)}

								<div className='flex gap-3'>
									<button
										type='button'
										onClick={recordAgain}
										className='rounded-full border px-5 py-2 text-sm font-medium hover:bg-accent'
									>
										Record again
									</button>
									{!saved && (
										<button
											type='button'
											onClick={() => setReviewing(true)}
											className='ms-auto rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:bg-foreground/90'
										>
											Review label
										</button>
									)}
								</div>

								{recording && previewUrl && (
									<UploadModal open={reviewing} onOpenChange={setReviewing}>
										<ReviewForm
											file={recording}
											previewUrl={previewUrl}
											fields={result.fields}
											category={null}
											onCancel={() => setReviewing(false)}
											onConfirm={saveToInventory}
										/>
									</UploadModal>
								)}
							</>
						)}

						{uploadError && recording && (
							<div className='flex gap-3'>
								<button
									type='button'
									onClick={() => upload(recording)}
									className='rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background'
								>
									Try upload again
								</button>
								<button
									type='button'
									onClick={recordAgain}
									className='rounded-full border px-5 py-2 text-sm font-medium hover:bg-accent'
								>
									Record again
								</button>
							</div>
						)}
					</div>
				</div>
			)}
		</main>
	);
}
