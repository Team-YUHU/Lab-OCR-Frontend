'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
	ArrowLeftIcon,
	CameraIcon,
	ChevronDownIcon,
	DownloadIcon,
	ExternalLinkIcon,
	ImageIcon,
	FlaskConicalIcon,
	FolderIcon,
	LoaderCircleIcon,
	PlusIcon,
	SearchIcon,
	Trash2Icon,
	UploadIcon,
	XIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from 'cn';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { UNCATEGORIZED_ID, UNCATEGORIZED_NAME } from '@/lib/categories';
import type { Vial } from '@/server/vials';
import { CSV_COLUMNS } from '@/features/labels/lib/label-csv';

type Category = { id: string; name: string };
type Group = { id: string; name: string; vials: Vial[] };

const byName = (a: Category, b: Category) =>
	a.name.toLowerCase().localeCompare(b.name.toLowerCase());

function vialTitle(vial: Vial) {
	return (
		vial.name || vial.fields.sampleId || vial.fileName || `Vial #${vial.id}`
	);
}

function vialSubtitle(vial: Vial) {
	return (
		[vial.fields.machine, vial.fields.component].filter(Boolean).join(' · ') ||
		vial.labelType ||
		'No machine recorded'
	);
}

function formatDate(value: string, withTime = false) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		...(withTime && { hour: 'numeric', minute: '2-digit' }),
	});
}

function matches(vial: Vial, query: string) {
	if (!query) return true;
	const haystack = [
		...Object.values(vial.fields),
		vial.labelType,
		vial.fileName,
		vial.categoryName,
		vial.name,
		vial.description,
		vial.createdByName,
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
	return query
		.toLowerCase()
		.split(/\s+/)
		.every((word) => haystack.includes(word));
}

async function readJson(response: Response) {
	const data = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(data.error ?? 'Something went wrong');
	return data;
}

export function InventoryView() {
	const searchParams = useSearchParams();
	const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
	const [categories, setCategories] = useState<Category[] | null>(null);
	const [vials, setVials] = useState<Vial[] | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [loadAttempt, setLoadAttempt] = useState(0);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

	useEffect(() => {
		const controller = new AbortController();
		const { signal } = controller;
		Promise.all([
			fetch('/api/v1/categories', { signal }).then(readJson),
			fetch('/api/v1/vials', { signal }).then(readJson),
		])
			.then(([categoryData, vialData]) => {
				setCategories(categoryData.categories);
				setVials(vialData.vials);
				setLoadError(null);
			})
			.catch((error: Error) => {
				if (!signal.aborted) setLoadError(error.message);
			});
		return () => controller.abort();
	}, [loadAttempt]);

	const groups = useMemo<Group[]>(() => {
		if (!categories || !vials) return [];
		const visible = vials
			.filter((vial) => matches(vial, query.trim()))
			// Newest first, like a chat history.
			.sort((a, b) => Number(b.id) - Number(a.id));
		const list: Group[] = categories.map((category) => ({
			...category,
			vials: visible.filter((vial) => vial.categoryId === category.id),
		}));
		const uncategorized = visible.filter((vial) => vial.categoryId === null);
		if (uncategorized.length > 0) {
			list.push({
				id: UNCATEGORIZED_ID,
				name: UNCATEGORIZED_NAME,
				vials: uncategorized,
			});
		}
		// While searching, hide groups with no matches.
		return query.trim() ? list.filter((group) => group.vials.length > 0) : list;
	}, [categories, vials, query]);

	const selected = vials?.find((vial) => vial.id === selectedId) ?? null;
	const matchCount = groups.reduce((sum, group) => sum + group.vials.length, 0);

	function replaceVial(updated: Vial) {
		setVials((current) =>
			current?.map((vial) => (vial.id === updated.id ? updated : vial)) ?? null,
		);
	}

	async function moveVial(vial: Vial, categoryId: string) {
		try {
			const data = await readJson(
				await fetch(`/api/v1/vials/${vial.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ categoryId: categoryId || null }),
				}),
			);
			replaceVial(data.vial);
			toast.success(`Moved to ${data.vial.categoryName}`);
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	async function deleteVial(vial: Vial) {
		if (!window.confirm(`Delete ${vialTitle(vial)}? This can't be undone.`)) {
			return;
		}
		try {
			const response = await fetch(`/api/v1/vials/${vial.id}`, {
				method: 'DELETE',
			});
			if (!response.ok && response.status !== 404) await readJson(response);
			setVials((current) => current?.filter((item) => item.id !== vial.id) ?? null);
			setSelectedId(null);
			toast.success('Vial deleted');
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	function addCategory(category: Category) {
		setCategories((current) =>
			[...(current ?? []).filter((item) => item.id !== category.id), category].sort(
				byName,
			),
		);
	}

	function toggleGroup(id: string) {
		setCollapsed((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	const loading = !loadError && (!categories || !vials);

	return (
		<main className="flex min-h-0 flex-1 md:h-dvh">
			{/* List panel, like Grok's conversation history */}
			<section
				aria-label="Vials"
				className={cn(
					'w-full flex-col border-r md:flex md:w-80 md:shrink-0 lg:w-96',
					selected ? 'hidden' : 'flex',
				)}
			>
				<header className="relative flex flex-col gap-3 p-4 pb-2">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-baseline gap-2">
							<h1 className="text-xl font-semibold tracking-tight">Inventory</h1>
							{vials && (
								<span className="text-sm text-muted-foreground tabular-nums">
									{vials.length} {vials.length === 1 ? 'vial' : 'vials'}
								</span>
							)}
						</div>
						<NewCategoryButton onAdded={addCategory} />
					</div>

					<div className="flex items-center gap-2 rounded-full border bg-card px-4 transition-colors focus-within:border-ring/60">
						<SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
						<label htmlFor="inventory-search" className="sr-only">
							Search vials
						</label>
						<input
							id="inventory-search"
							type="search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search vials"
							autoComplete="off"
							className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
						/>
						{query && (
							<button
								type="button"
								aria-label="Clear search"
								onClick={() => setQuery('')}
								className="text-muted-foreground hover:text-foreground"
							>
								<XIcon className="size-4" aria-hidden />
							</button>
						)}
					</div>
				</header>

				<div className="flex-1 overflow-y-auto px-2 pb-4">
					{loading && (
						<p
							role="status"
							className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground"
						>
							<LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
							Loading inventory…
						</p>
					)}

					{loadError && (
						<div role="alert" className="flex flex-col items-start gap-3 px-3 py-6 text-sm">
							<p className="text-destructive">{loadError}</p>
							<button
								type="button"
								onClick={() => {
									setLoadError(null);
									setLoadAttempt((attempt) => attempt + 1);
								}}
								className="rounded-full border px-4 py-1.5 hover:bg-accent"
							>
								Try again
							</button>
						</div>
					)}

					{!loading && !loadError && query.trim() && matchCount === 0 && (
						<p className="px-3 py-6 text-sm text-muted-foreground">
							No vials match &ldquo;{query.trim()}&rdquo;.
						</p>
					)}

					{!loading && !loadError && !query.trim() && vials?.length === 0 && (
						<EmptyInventory />
					)}

					{groups.map((group) => {
						const isOpen = !collapsed.has(group.id) || Boolean(query.trim());
						const contentId = `group-${group.id}`;
						return (
							<section key={group.id} aria-label={group.name} className="mt-3">
								<div className="group/heading flex items-center gap-1 pr-1">
									<button
										type="button"
										aria-expanded={isOpen}
										aria-controls={contentId}
										onClick={() => toggleGroup(group.id)}
										className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
									>
										<ChevronDownIcon
											className={cn(
												'size-3.5 shrink-0 transition-transform',
												!isOpen && '-rotate-90',
											)}
											aria-hidden
										/>
										<span className="truncate">{group.name}</span>
										<span className="tabular-nums opacity-70">{group.vials.length}</span>
									</button>
									{group.vials.length > 0 && (
										<a
											href={`/api/v1/categories/${group.id}/csv`}
											download
											aria-label={`Export ${group.name} as CSV`}
											title="Export CSV"
											className="rounded-full p-1.5 text-muted-foreground opacity-100 transition-opacity hover:bg-accent hover:text-foreground md:opacity-0 md:group-hover/heading:opacity-100 md:focus-visible:opacity-100"
										>
											<DownloadIcon className="size-3.5" aria-hidden />
										</a>
									)}
								</div>

								<ul id={contentId} hidden={!isOpen} className="flex flex-col gap-0.5">
									{group.vials.length === 0 && (
										<li className="px-3 py-1.5 text-xs text-muted-foreground/70">
											No vials yet
										</li>
									)}
									{group.vials.map((vial) => {
										const isActive = vial.id === selectedId;
										return (
											<li key={vial.id}>
												<button
													type="button"
													aria-current={isActive ? 'true' : undefined}
													onClick={() => setSelectedId(vial.id)}
													className={cn(
														'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-accent/70',
														isActive && 'bg-accent',
													)}
												>
													<span className="min-w-0 flex-1">
														<span className="block truncate text-sm">{vialTitle(vial)}</span>
														<span className="block truncate text-xs text-muted-foreground">
															{vialSubtitle(vial)}
														</span>
													</span>
													<span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
														{formatDate(vial.scannedAt ?? vial.createdAt)}
													</span>
												</button>
											</li>
										);
									})}
								</ul>
							</section>
						);
					})}
				</div>
			</section>

			{/* Detail pane */}
			<section
				aria-label="Vial details"
				className={cn(
					'min-w-0 flex-1 flex-col md:flex md:overflow-y-auto',
					selected ? 'flex' : 'hidden',
				)}
			>
				{selected && categories ? (
					<VialDetails
						vial={selected}
						categories={categories}
						onBack={() => setSelectedId(null)}
						onMove={(categoryId) => moveVial(selected, categoryId)}
						onDelete={() => deleteVial(selected)}
					/>
				) : (
					<div className="m-auto flex max-w-sm flex-col items-center gap-3 p-8 text-center">
						<span className="flex size-12 items-center justify-center rounded-full border text-muted-foreground">
							<FlaskConicalIcon className="size-5" aria-hidden />
						</span>
						<h2 className="font-medium">Select a vial</h2>
						<p className="text-sm text-muted-foreground">
							Pick a vial from the list to see its label values, move it to another
							category, or remove it.
						</p>
					</div>
				)}
			</section>
		</main>
	);
}

function VialDetails({
	vial,
	categories,
	onBack,
	onMove,
	onDelete,
}: {
	vial: Vial;
	categories: Category[];
	onBack: () => void;
	onMove: (categoryId: string) => void;
	onDelete: () => void;
}) {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-8">
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={onBack}
					aria-label="Back to the list"
					className="-ml-1 rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
				>
					<ArrowLeftIcon className="size-5" aria-hidden />
				</button>
				<div className="min-w-0 flex-1">
					<p className="text-xs text-muted-foreground">
						{vial.categoryName}
						{vial.labelType && ` · ${vial.labelType} label`}
					</p>
					<h2 className="truncate text-2xl font-semibold tracking-tight">
						{vialTitle(vial)}
					</h2>
					{vial.name && vial.fields.sampleId && (
						<p className="truncate font-mono text-sm text-muted-foreground">
							{vial.fields.sampleId}
						</p>
					)}
				</div>
			</div>

			{vial.description && (
				<p className="text-sm whitespace-pre-line break-words">
					{vial.description}
				</p>
			)}

			<dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
				<div className="flex flex-col gap-0.5">
					<dt className="text-xs text-muted-foreground">Scanned</dt>
					<dd>
						{vial.scannedAt ? (
							formatDate(vial.scannedAt, true)
						) : (
							<span className="text-muted-foreground">Not recorded</span>
						)}
					</dd>
				</div>
				<div className="flex flex-col gap-0.5">
					<dt className="text-xs text-muted-foreground">Added by</dt>
					<dd>
						{vial.createdByName ?? (
							<span className="text-muted-foreground">Unknown</span>
						)}
					</dd>
				</div>
				<div className="flex flex-col gap-0.5">
					<dt className="text-xs text-muted-foreground">Added</dt>
					<dd>{formatDate(vial.createdAt, true)}</dd>
				</div>
			</dl>

			<VialMedia vial={vial} />

			<dl className="grid gap-px overflow-hidden rounded-3xl border bg-border sm:grid-cols-2">
				{CSV_COLUMNS.map(({ name, label }) => (
					<div key={name} className="flex flex-col gap-1 bg-card px-5 py-4">
						<dt className="text-xs text-muted-foreground">{label}</dt>
						<dd className="truncate font-mono text-sm">
							{vial.fields[name] || <span className="text-muted-foreground">—</span>}
						</dd>
					</div>
				))}
			</dl>

			<div className="flex flex-col gap-4 rounded-3xl border bg-card p-5">
				<div className="flex flex-wrap items-end gap-3">
					<label className="flex min-w-48 flex-1 flex-col gap-1.5 text-xs text-muted-foreground">
						Category
						<NativeSelect
							value={vial.categoryId ?? ''}
							onChange={(event) => onMove(event.target.value)}
							className="w-full"
						>
							<NativeSelectOption value="">{UNCATEGORIZED_NAME}</NativeSelectOption>
							{categories.map((category) => (
								<NativeSelectOption key={category.id} value={category.id}>
									{category.name}
								</NativeSelectOption>
							))}
						</NativeSelect>
					</label>
					<a
						href={`/api/v1/categories/${vial.categoryId ?? UNCATEGORIZED_ID}/csv`}
						download
						className="flex h-9 items-center gap-2 rounded-full border px-4 text-sm hover:bg-accent"
					>
						<DownloadIcon className="size-4" aria-hidden />
						Export category
					</a>
					<button
						type="button"
						onClick={onDelete}
						className="flex h-9 items-center gap-2 rounded-full px-4 text-sm text-destructive hover:bg-destructive/10"
					>
						<Trash2Icon className="size-4" aria-hidden />
						Delete
					</button>
				</div>
				{vial.fileName && (
					<p className="flex items-center gap-2 text-xs text-muted-foreground">
						<FolderIcon className="size-3.5" aria-hidden />
						From {vial.fileName}
					</p>
				)}
			</div>
		</div>
	);
}

/** The photo the label was read from, or a still from its video. For reference only: it can't be changed. */
function VialMedia({ vial }: { vial: Vial }) {
	const { media } = vial;
	const fromVideo = /\.(mp4|webm|mov|m4v)$/i.test(vial.fileName ?? '');
	const heading = fromVideo ? 'Still from the video' : 'Original photo';

	return (
		<section aria-label={heading} className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
			<div className="flex items-center justify-between gap-3 px-1">
				<h3 className="flex items-center gap-2 text-sm font-medium">
					<ImageIcon className="size-4 text-muted-foreground" aria-hidden />
					{heading}
				</h3>
				{media && (
					<a
						href={media.url}
						target="_blank"
						rel="noreferrer"
						className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
					>
						Open
						<ExternalLinkIcon className="size-3.5" aria-hidden />
					</a>
				)}
			</div>
			{media ? (
				// Served from Cloudinary's domain, which next/image isn't set up for.
				// eslint-disable-next-line @next/next/no-img-element
				<img
					// Remounts when another vial is picked, so the old image doesn't linger while loading.
					key={media.url}
					src={media.url}
					alt={`${heading} of ${vialTitle(vial)}`}
					className="max-h-80 w-full rounded-2xl bg-muted object-contain"
				/>
			) : (
				<p className="px-1 pb-1 text-sm text-muted-foreground">
					No photo was kept for this vial.
				</p>
			)}
		</section>
	);
}

function NewCategoryButton({ onAdded }: { onAdded: (category: Category) => void }) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function close() {
		setOpen(false);
		setName('');
		setError(null);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		setError(null);
		try {
			const data = await readJson(
				await fetch('/api/v1/categories', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name }),
				}),
			);
			onAdded(data.category);
			toast.success(`Added ${data.category.name}`);
			close();
		} catch (caught) {
			setError((caught as Error).message);
		} finally {
			setSaving(false);
		}
	}

	if (!open) {
		return (
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
			>
				<PlusIcon className="size-3.5" aria-hidden />
				Category
			</button>
		);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="absolute inset-x-4 top-4 z-10 flex flex-col gap-2 rounded-2xl border bg-popover p-3 shadow-xl md:relative md:inset-auto md:w-56"
		>
			<label htmlFor="new-category" className="text-xs text-muted-foreground">
				New category
			</label>
			<input
				id="new-category"
				autoFocus
				value={name}
				maxLength={100}
				autoComplete="off"
				onChange={(event) => setName(event.target.value)}
				onKeyDown={(event) => event.key === 'Escape' && close()}
				className="h-9 rounded-full border bg-background px-3 text-sm outline-none focus:border-ring/60"
			/>
			{error && (
				<p role="alert" className="text-xs text-destructive">
					{error}
				</p>
			)}
			<div className="flex justify-end gap-2">
				<button
					type="button"
					onClick={close}
					className="rounded-full px-3 py-1 text-xs hover:bg-accent"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={!name.trim() || saving}
					className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background disabled:opacity-50"
				>
					{saving ? 'Adding…' : 'Add'}
				</button>
			</div>
		</form>
	);
}

function EmptyInventory() {
	return (
		<div className="flex flex-col items-start gap-3 px-3 py-6 text-sm">
			<p className="text-muted-foreground">
				No vials yet. Scan or upload a label to add one.
			</p>
			<div className="flex gap-2">
				<Link
					href="/camera"
					className="flex items-center gap-2 rounded-full border px-3 py-1.5 hover:bg-accent"
				>
					<CameraIcon className="size-4" aria-hidden />
					Scan
				</Link>
				<Link
					href="/file-upload"
					className="flex items-center gap-2 rounded-full border px-3 py-1.5 hover:bg-accent"
				>
					<UploadIcon className="size-4" aria-hidden />
					Upload
				</Link>
			</div>
		</div>
	);
}
