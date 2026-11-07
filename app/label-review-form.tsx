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

export function LabelReviewForm() {
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [fields, setFields] = useState<Fields | null>(null);
	const [labelType, setLabelType] = useState<string | null>(null);
	const [fileName, setFileName] = useState('');
	const [isReading, setIsReading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Release the preview's memory when it's replaced or the page closes.
	useEffect(() => {
		return () => {
			if (imageUrl) URL.revokeObjectURL(imageUrl);
		};
	}, [imageUrl]);

	async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		// Allows choosing the same file again to retry.
		event.target.value = '';
		if (!file) return;

		setImageUrl(URL.createObjectURL(file));
		setFields(null);
		setLabelType(null);
		setError(null);
		setIsReading(true);

		try {
			const body = new FormData();
			body.append('image', file);

			const response = await fetch('/api/v1/ocr', { method: 'POST', body });
			const result = await response.json();

			if (!response.ok) {
				setError(result.error ?? 'Could not read the label');
				return;
			}
			setLabelType(result.labelType);
			setFields({ ...result.fields, dateReceived: todayLocal() });
		} catch {
			setError('Could not reach the server. Please try again.');
		} finally {
			setIsReading(false);
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
				Label photo
				<input
					type="file"
					accept="image/png,image/jpeg,image/webp"
					disabled={isReading}
					onChange={handleImageChange}
					className="rounded-md border border-zinc-300 p-2 font-normal disabled:opacity-50 dark:border-zinc-700"
				/>
			</label>

			{imageUrl && (
				// A local blob preview, so next/image's optimization doesn't apply.
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={imageUrl}
					alt="Uploaded sample tube label"
					className="max-h-64 w-full rounded-md border border-zinc-300 object-contain dark:border-zinc-700"
				/>
			)}

			{isReading && <p role="status">Reading label…</p>}

			{error && (
				<p role="alert" className="text-red-700 dark:text-red-400">
					{error}
				</p>
			)}

			{fields && (
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<p className="text-sm text-zinc-600 dark:text-zinc-400">
						{labelType && `Detected a ${labelType} label. `}
						Check each value against the photo and correct any mistakes. Empty
						fields stay empty in the CSV.
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
