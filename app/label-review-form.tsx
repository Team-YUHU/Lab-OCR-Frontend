'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
	CSV_COLUMNS,
	buildCsv,
	todayLocal,
	toCsvFileName,
	type FieldName,
	type Fields,
} from './label-csv';
import {
	mergeFrameResults,
	type FrameResult,
	type MergedResult,
} from './label-merge';
import { VideoFrameError, extractFrames, isVideoFile } from './video-frames';

type Preview = { url: string; isVideo: boolean };

export function LabelReviewForm() {
	const [preview, setPreview] = useState<Preview | null>(null);
	const [fields, setFields] = useState<Fields | null>(null);
	const [labelType, setLabelType] = useState<string | null>(null);
	const [alternatives, setAlternatives] = useState<
		MergedResult['alternatives']
	>({});
	const [fileName, setFileName] = useState('');
	const [status, setStatus] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Release the preview's memory when it's replaced or the page closes.
	useEffect(() => {
		return () => {
			if (preview) URL.revokeObjectURL(preview.url);
		};
	}, [preview]);

	async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		// Allows choosing the same file again to retry.
		event.target.value = '';
		if (!file) return;

		const isVideo = isVideoFile(file);
		setPreview({ url: URL.createObjectURL(file), isVideo });
		setFields(null);
		setLabelType(null);
		setAlternatives({});
		setError(null);

		try {
			let images: Blob[] = [file];
			if (isVideo) {
				setStatus('Finding the sharpest video frames…');
				images = await extractFrames(file);
			}

			// One at a time, because a local model works through them one by one anyway.
			const results: FrameResult[] = [];
			let lastError: string | null = null;

			for (const [index, image] of images.entries()) {
				setStatus(
					isVideo
						? `Reading frame ${index + 1} of ${images.length}…`
						: 'Reading label…',
				);
				const body = new FormData();
				body.append(
					'image',
					image,
					isVideo ? `frame-${index + 1}.jpg` : file.name,
				);

				const response = await fetch('/api/v1/ocr', { method: 'POST', body });
				const result = await response.json();

				if (response.ok) results.push(result);
				else lastError = result.error;
			}

			if (results.length === 0) {
				setError(lastError ?? 'Could not read the label');
				return;
			}

			const merged = mergeFrameResults(results);
			setLabelType(merged.labelType);
			setAlternatives(merged.alternatives);
			setFields({ ...merged.fields, dateReceived: todayLocal() });
		} catch (caught) {
			setError(
				caught instanceof VideoFrameError
					? caught.message
					: 'Could not reach the server. Please try again.',
			);
		} finally {
			setStatus(null);
		}
	}

	function handleFieldChange(name: FieldName, value: string) {
		setFields((current) => (current ? { ...current, [name]: value } : current));
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const name = toCsvFileName(fileName);
		if (!fields || !name) {
			setError('Enter a valid file name.');
			return;
		}
		setError(null);

		const url = URL.createObjectURL(
			new Blob([buildCsv(fields)], { type: 'text/csv;charset=utf-8' }),
		);
		const link = document.createElement('a');
		link.href = url;
		link.download = name;
		link.click();
		URL.revokeObjectURL(url);
	}

	return (
		<div className="flex flex-col gap-6">
			<label className="flex flex-col gap-2 text-sm font-medium">
				Label photo or video
				<input
					type="file"
					accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime,.mov,.m4v"
					disabled={status !== null}
					onChange={handleFileChange}
					className="rounded-md border border-zinc-300 p-2 font-normal disabled:opacity-50 dark:border-zinc-700"
				/>
			</label>

			{preview?.isVideo && (
				<video
					src={preview.url}
					controls
					muted
					playsInline
					aria-label="Uploaded sample tube label video"
					className="max-h-64 w-full rounded-md border border-zinc-300 dark:border-zinc-700"
				/>
			)}

			{preview && !preview.isVideo && (
				// A local blob preview, so next/image's optimization doesn't apply.
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={preview.url}
					alt="Uploaded sample tube label"
					className="max-h-64 w-full rounded-md border border-zinc-300 object-contain dark:border-zinc-700"
				/>
			)}

			{status && <p role="status">{status}</p>}

			{error && (
				<p role="alert" className="text-red-700 dark:text-red-400">
					{error}
				</p>
			)}

			{fields && (
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<p className="text-sm text-zinc-600 dark:text-zinc-400">
						{labelType && `Detected a ${labelType} label. `}
						Check each value against the {preview?.isVideo ? 'video' : 'photo'}{' '}
						and correct any mistakes. Empty fields stay empty in the CSV.
					</p>

					{CSV_COLUMNS.map(({ name, label }) => (
						<label key={name} className="flex flex-col gap-1 text-sm font-medium">
							{label}
							<input
								type="text"
								value={fields[name]}
								autoComplete="off"
								onChange={(event) => handleFieldChange(name, event.target.value)}
								className="rounded-md border border-zinc-300 bg-transparent p-2 font-mono text-base font-normal dark:border-zinc-700"
							/>
							{name !== 'dateReceived' && alternatives[name] && (
								<span className="font-normal text-amber-700 dark:text-amber-400">
									Video frames disagreed. Also read:{' '}
									{alternatives[name].join(', ')}
								</span>
							)}
						</label>
					))}

					<label className="flex flex-col gap-1 text-sm font-medium">
						CSV file name
						<input
							type="text"
							required
							value={fileName}
							autoComplete="off"
							onChange={(event) => setFileName(event.target.value)}
							className="rounded-md border border-zinc-300 bg-transparent p-2 text-base font-normal dark:border-zinc-700"
						/>
					</label>

					<button
						type="submit"
						className="self-start rounded-md bg-foreground px-4 py-2 font-medium text-background"
					>
						Download CSV
					</button>
				</form>
			)}
		</div>
	);
}
