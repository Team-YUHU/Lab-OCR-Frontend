'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { ArchiveIcon, ClipboardCheckIcon, ScanTextIcon } from 'lucide-react';
import { MoleculeField } from './molecule-field';

// The sign-in page's frame. Email and password only: sign-up and Google sign-in are
// closed, and accounts are added in Clerk by an admin.

/**
 * The sign-in card. With an `aside`, wide screens get it as a panel on the
 * left and the form on the right; narrower screens show only the form.
 */
export function AuthCard({
	title,
	description,
	children,
	footer,
	aside,
}: {
	title: string;
	description?: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
	aside?: ReactNode;
}) {
	const form = (
		<div className='flex w-full max-w-sm flex-col gap-6'>
			<div className='flex flex-col items-center gap-3 text-center'>
				<Image
					src='/mrg-logo.png'
					alt='MRG Laboratories'
					width={80}
					height={48}
					// The panel already shows the logo on wide screens.
					className={aside ? 'h-12 w-20 object-contain lg:hidden' : 'h-12 w-20 object-contain'}
					priority
				/>
				<h1 className='text-2xl font-semibold tracking-tight'>{title}</h1>
				{description && <p className='text-sm text-muted-foreground'>{description}</p>}
			</div>
			<div className='flex flex-col gap-4 rounded-3xl border bg-card p-6'>{children}</div>
			{footer && <p className='text-center text-sm text-muted-foreground'>{footer}</p>}
		</div>
	);

	if (!aside) {
		return <main className='flex flex-1 items-center justify-center px-4 py-10'>{form}</main>;
	}
	return (
		<main className='grid flex-1 lg:min-h-dvh lg:grid-cols-2'>
			{aside}
			<div className='flex items-center justify-center px-4 py-10'>{form}</div>
		</main>
	);
}

const FEATURES = [
	{ icon: ScanTextIcon, text: 'Read sample labels from a photo or a short video.' },
	{ icon: ClipboardCheckIcon, text: 'Check every value before it is saved.' },
	{ icon: ArchiveIcon, text: 'Keep every vial in one searchable inventory.' },
];

/**
 * The branding panel the sign-in steps pass as `aside`. One shared element, so moving
 * between steps doesn't restart the animation.
 */
export const MRG_BRAND = (
	<BrandPanel>
		<div className='flex flex-col gap-3'>
			<h2 className='text-4xl font-semibold tracking-tight'>MRG Labs OCR</h2>
			<p className='text-balance text-muted-foreground'>
				Lab sample labels, read in seconds and kept in one place.
			</p>
		</div>
		<ul className='flex flex-col gap-3 text-left text-sm'>
			{FEATURES.map(({ icon: Icon, text }) => (
				<li key={text} className='flex items-center gap-3'>
					<span className='flex size-8 shrink-0 items-center justify-center rounded-full border bg-background/70'>
						<Icon className='size-4' aria-hidden />
					</span>
					{text}
				</li>
			))}
		</ul>
	</BrandPanel>
);

/** The left-hand branding panel: the logo and pitch over a slow field of molecules. */
export function BrandPanel({ children }: { children?: ReactNode }) {
	return (
		<section
			aria-label='MRG Labs OCR'
			className='relative hidden overflow-hidden border-r bg-sidebar lg:flex lg:items-center lg:justify-center'
		>
			<MoleculeField
				// Fades the particles out toward the middle so they never sit on top of the text.
				className='absolute inset-0 size-full mask-[radial-gradient(ellipse_55%_45%_at_50%_50%,transparent_35%,black_100%)]'
			/>
			<div className='relative flex max-w-md flex-col items-center gap-6 px-10 text-center'>
				<Image
					src='/mrg-logo.png'
					alt='MRG Laboratories'
					width={160}
					height={96}
					className='h-24 w-40 object-contain'
					priority
				/>
				{children}
			</div>
		</section>
	);
}
