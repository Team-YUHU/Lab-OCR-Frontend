'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Form pieces for the sign-in steps.

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
