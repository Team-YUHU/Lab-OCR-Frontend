'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SetActiveNavigate } from '@clerk/nextjs/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoleculeField } from '@/components/molecule-field';
import { ArchiveIcon, ClipboardCheckIcon, ScanTextIcon } from 'lucide-react';

// Shared pieces of the custom sign-in page. Email and password only: sign-up and
// Google sign-in are closed, and accounts are added in Clerk by an admin.

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
 * The branding panel both auth pages pass as `aside`. One shared element, so moving
 * between steps of a form doesn't restart the animation.
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

/** A labelled input with its error underneath. */
export function Field({
	label,
	error,
	hint,
	...props
}: ComponentProps<'input'> & {
	label: string;
	error?: string | null;
	hint?: string;
}) {
	const id = useId();
	const detailsId = `${id}-details`;
	return (
		<div className='flex flex-col gap-1.5'>
			<Label htmlFor={id}>{label}</Label>
			<Input
				id={id}
				aria-invalid={error ? true : undefined}
				aria-describedby={error || hint ? detailsId : undefined}
				className='h-10'
				{...props}
			/>
			{(error || hint) && (
				<p
					id={detailsId}
					className={error ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}
				>
					{error ?? hint}
				</p>
			)}
		</div>
	);
}

/** The 6-digit code Clerk emails. */
export function CodeField({
	value,
	onChange,
	error,
}: {
	value: string;
	onChange: (value: string) => void;
	error?: string;
}) {
	return (
		<Field
			label='Verification code'
			inputMode='numeric'
			autoComplete='one-time-code'
			autoFocus
			required
			maxLength={6}
			value={value}
			onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
			error={error}
			className='h-10 text-center font-mono text-lg tracking-[0.5em]'
		/>
	);
}

export function SubmitButton({
	busy,
	busyLabel,
	children,
	disabled,
}: {
	busy: boolean;
	busyLabel: string;
	children: ReactNode;
	disabled?: boolean;
}) {
	return (
		<Button type='submit' size='lg' className='h-10 w-full' disabled={busy || disabled}>
			{busy ? busyLabel : children}
		</Button>
	);
}

export function FormError({ message }: { message: string | null }) {
	if (!message) return null;
	return (
		<p role='alert' className='rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive'>
			{message}
		</p>
	);
}

/** A readable message from a Clerk error, without its class-name prefix. */
export function clerkMessage(error: unknown) {
	if (!error) return null;
	const apiError = (error as { errors?: { longMessage?: string; message?: string }[] })
		.errors?.[0];
	return (
		apiError?.longMessage ??
		apiError?.message ??
		(error as { longMessage?: string }).longMessage ??
		'Something went wrong. Please try again.'
	);
}

/**
 * Whether Clerk refused a password because it appears in a known data breach. The instance
 * checks this at sign-in too ("Reject compromised passwords"), so the only way forward is a
 * new password.
 */
export function isBreachedPassword(error: unknown) {
	const code = (error as { errors?: { code?: string }[] } | null)?.errors?.[0]?.code;
	return code?.startsWith('form_password_pwned') ?? false;
}

/** The first page-level error Clerk reported, if any. Field errors show under their fields. */
export function globalMessage(errors: { global: unknown[] | null }) {
	return clerkMessage(errors.global?.[0]);
}

/**
 * Where to go after signing in: the page the proxy sent them away from, if it's on this site.
 * The proxy passes it as an absolute URL in ?redirect_url=.
 */
export function useDestination() {
	const requested = useSearchParams().get('redirect_url');
	return () => {
		if (!requested) return '/';
		try {
			const url = new URL(requested, window.location.origin);
			if (url.origin !== window.location.origin) return '/';
			if (url.pathname.startsWith('/sign-')) return '/';
			return `${url.pathname}${url.search}${url.hash}`;
		} catch {
			return '/';
		}
	};
}

/** Moves into the app once Clerk has made the session active. */
export function useNavigateIntoApp(getDestination: () => string): SetActiveNavigate {
	const router = useRouter();
	return ({ decorateUrl }) => {
		// decorateUrl can return an absolute URL to refresh cookies in Safari.
		const url = decorateUrl(getDestination());
		if (url.startsWith('http')) window.location.href = url;
		else router.push(url);
	};
}
