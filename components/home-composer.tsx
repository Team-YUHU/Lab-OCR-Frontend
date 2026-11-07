'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
	ArchiveIcon,
	ArrowUpIcon,
	CameraIcon,
	SearchIcon,
	UploadIcon,
} from 'lucide-react';

const ACTIONS = [
	{ href: '/camera', label: 'Scan with camera', icon: CameraIcon },
	{ href: '/file-upload', label: 'Upload labels', icon: UploadIcon },
	{ href: '/inventory', label: 'Browse inventory', icon: ArchiveIcon },
];

/** A Grok-style prompt box: searching it opens the inventory filtered by the query. */
export function HomeComposer() {
	const router = useRouter();
	const [query, setQuery] = useState('');

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const q = query.trim();
		router.push(q ? `/inventory?q=${encodeURIComponent(q)}` : '/inventory');
	}

	return (
		<div className="flex w-full flex-col gap-4">
			<form
				onSubmit={handleSubmit}
				role="search"
				className="flex items-center gap-2 rounded-[28px] border bg-card p-2 pl-5 shadow-[0_8px_30px_rgb(0_0_0/0.35)] transition-colors focus-within:border-ring/60"
			>
				<SearchIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
				<label htmlFor="home-search" className="sr-only">
					Search the inventory
				</label>
				<input
					id="home-search"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Search vials by sample ID, machine, lube…"
					autoComplete="off"
					className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
				/>
				<button
					type="submit"
					aria-label="Search"
					className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-85"
				>
					<ArrowUpIcon className="size-5" aria-hidden />
				</button>
			</form>

			<div className="flex flex-wrap justify-center gap-2">
				{ACTIONS.map(({ href, label, icon: Icon }) => (
					<Link
						key={href}
						href={href}
						className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
					>
						<Icon className="size-4" aria-hidden />
						{label}
					</Link>
				))}
			</div>
		</div>
	);
}
