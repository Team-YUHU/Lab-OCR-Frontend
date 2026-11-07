'use client';

import { useEffect, useRef, useState } from 'react';
import { CSV_COLUMNS } from '../label-csv';

// Plain types, because the OCR route rejects any type with a codecs suffix.
// iOS Safari only records MP4.
const RECORDING_FORMATS = [
	{ type: 'video/webm', extension: 'webm' },
	{ type: 'video/mp4', extension: 'mp4' },
];

type Phase = 'starting' | 'ready' | 'recording' | 'uploading' | 'done';
type OcrResult = { labelType: string | null; fields: Record<string, string> };

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

export default function CameraPage() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const recorderRef = useRef<MediaRecorder | null>(null);

	const [phase, setPhase] = useState<Phase>('starting');
	const [recording, setRecording] = useState<File | null>(null);
	const [elapsed, setElapsed] = useState(0);
	const [cameraError, setCameraError] = useState<string | null>(null);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [result, setResult] = useState<OcrResult | null>(null);

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

			if (response.ok) setResult(data);
			else setUploadError(data.error ?? 'Could not read the label.');
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
		};

		recorderRef.current = recorder;
		recorder.start();
		setElapsed(0);
		setPhase('recording');
	}

	function recordAgain() {
		setRecording(null);
		setResult(null);
		setUploadError(null);
		setElapsed(0);
		setPhase('ready');
	}

	const isRecording = phase === 'recording';

	return (
		<main className="fixed inset-0 flex flex-col bg-black text-white">
			<video
				ref={videoRef}
				autoPlay
				muted
				playsInline
				aria-label="Camera viewfinder"
				className="absolute inset-0 h-full w-full object-cover"
			/>

			<div className="relative flex justify-center p-4">
				{(isRecording || phase === 'ready') && (
					<span
						role="timer"
						className={`rounded-md px-2 py-1 font-mono text-lg tabular-nums ${
							isRecording ? 'bg-red-600' : 'bg-black/40'
						}`}
					>
						{formatElapsed(elapsed)}
					</span>
				)}
			</div>

			{cameraError && (
				<p role="alert" className="relative m-auto max-w-sm p-6 text-center">
					{cameraError}
				</p>
			)}

			{!cameraError && (phase === 'ready' || isRecording) && (
				<div className="relative mt-auto flex justify-center bg-black/40 py-8">
					<button
						type="button"
						onClick={() =>
							isRecording ? recorderRef.current?.stop() : startRecording()
						}
						aria-label={isRecording ? 'Stop recording' : 'Start recording'}
						className="flex size-20 items-center justify-center rounded-full border-4 border-white"
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
				<div className="absolute inset-0 flex items-center justify-center bg-black/70">
					<p role="status">Reading the label…</p>
				</div>
			)}

			{phase === 'done' && (
				<div className="absolute inset-0 overflow-y-auto bg-black/90">
					<div className="mx-auto flex max-w-md flex-col gap-4 p-6">
						{uploadError && <p role="alert">{uploadError}</p>}

						{result && (
							<>
								<h1 className="text-xl font-semibold">
									{result.labelType
										? `Read a ${result.labelType} label`
										: 'Label results'}
								</h1>
								<dl className="flex flex-col gap-3">
									{CSV_COLUMNS.filter(
										({ name }) => name !== 'dateReceived',
									).map(({ name, label }) => (
										<div key={name}>
											<dt className="text-sm text-zinc-400">{label}</dt>
											<dd className="font-mono">{result.fields[name] || '—'}</dd>
										</div>
									))}
								</dl>
							</>
						)}

						<div className="flex gap-3">
							{uploadError && recording && (
								<button
									type="button"
									onClick={() => upload(recording)}
									className="rounded-md bg-white px-4 py-2 font-medium text-black"
								>
									Try upload again
								</button>
							)}
							<button
								type="button"
								onClick={recordAgain}
								className="rounded-md border border-white px-4 py-2 font-medium"
							>
								Record again
							</button>
						</div>
					</div>
				</div>
			)}
		</main>
	);
}
