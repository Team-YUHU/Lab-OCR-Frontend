'use client';

import { useState, type FormEvent } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import {
	useDestination,
	useNavigateIntoApp,
} from '@/features/auth/hooks/use-sign-in-redirect';
import { globalMessage, isBreachedPassword } from '@/features/auth/lib/clerk-errors';
import { CodeField, Field, FormError, SubmitButton } from './auth-fields';
import { AuthCard, MRG_BRAND } from './auth-layout';

type Step =
	| 'password' // email and password
	| 'verify' // a code, when Clerk asks for a second check (e.g. a new device)
	| 'reset-code' // forgot password: the code from the reset email
	| 'reset-password'; // forgot password: the new password

export function SignInForm() {
	const { signIn, errors, fetchStatus } = useSignIn();
	const getDestination = useDestination();
	const navigate = useNavigateIntoApp(getDestination);

	const [step, setStep] = useState<Step>('password');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [code, setCode] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [problem, setProblem] = useState<string | null>(null);
	/** The password was refused as breached, so offer a reset right there. */
	const [breached, setBreached] = useState(false);

	const busy = fetchStatus === 'fetching';
	const formError = problem ?? globalMessage(errors);

	/** Finishes the sign-in, or moves to whatever step Clerk still needs. */
	async function continueSignIn() {
		if (signIn.status === 'complete') {
			await signIn.finalize({ navigate });
			return;
		}
		if (
			signIn.status === 'needs_second_factor' ||
			signIn.status === 'needs_client_trust'
		) {
			const canEmail = signIn.supportedSecondFactors.some(
				(factor) => factor.strategy === 'email_code',
			);
			if (!canEmail) {
				setProblem('This account needs a verification method this page does not support.');
				return;
			}
			const { error } = await signIn.mfa.sendEmailCode();
			if (!error) {
				setCode('');
				setStep('verify');
			}
			return;
		}
		setProblem('Could not finish signing in. Please try again.');
	}

	async function handlePassword(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setProblem(null);
		setBreached(false);
		const { error } = await signIn.password({ identifier: email.trim(), password });
		if (!error) await continueSignIn();
		else if (isBreachedPassword(error)) setBreached(true);
	}

	async function handleVerify(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setProblem(null);
		const { error } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
		if (!error) await continueSignIn();
	}

	async function startReset() {
		setProblem(null);
		setBreached(false);
		if (!email.trim()) {
			setProblem('Enter your email first, then choose "Forgot password?".');
			return;
		}
		const created = await signIn.create({ identifier: email.trim() });
		if (created.error) return;
		const { error } = await signIn.resetPasswordEmailCode.sendCode();
		if (!error) {
			setCode('');
			setStep('reset-code');
		}
	}

	async function handleResetCode(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setProblem(null);
		const { error } = await signIn.resetPasswordEmailCode.verifyCode({
			code: code.trim(),
		});
		if (!error) {
			setNewPassword('');
			setStep('reset-password');
		}
	}

	async function handleNewPassword(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setProblem(null);
		const { error } = await signIn.resetPasswordEmailCode.submitPassword({
			password: newPassword,
		});
		if (!error) await continueSignIn();
	}

	async function startOver() {
		setProblem(null);
		setCode('');
		setStep('password');
		await signIn.reset();
	}

	const backButton = (
		<Button type='button' variant='ghost' onClick={() => void startOver()}>
			Back to sign in
		</Button>
	);

	if (step === 'verify') {
		return (
			<AuthCard
				aside={MRG_BRAND}
				title='Check your email'
				description={<>Enter the code we sent to {email.trim()} to finish signing in.</>}
			>
				<form onSubmit={handleVerify} className='flex flex-col gap-4'>
					<CodeField value={code} onChange={setCode} error={errors.fields.code?.message} />
					<FormError message={formError} />
					<SubmitButton busy={busy} busyLabel='Checking…' disabled={!code.trim()}>
						Verify
					</SubmitButton>
					<Button
						type='button'
						variant='ghost'
						disabled={busy}
						onClick={() => void signIn.mfa.sendEmailCode()}
					>
						Send a new code
					</Button>
					{backButton}
				</form>
			</AuthCard>
		);
	}

	if (step === 'reset-code') {
		return (
			<AuthCard
				aside={MRG_BRAND}
				title='Reset your password'
				description={<>Enter the code we sent to {email.trim()}.</>}
			>
				<form onSubmit={handleResetCode} className='flex flex-col gap-4'>
					<CodeField value={code} onChange={setCode} error={errors.fields.code?.message} />
					<FormError message={formError} />
					<SubmitButton busy={busy} busyLabel='Checking…' disabled={!code.trim()}>
						Continue
					</SubmitButton>
					<Button
						type='button'
						variant='ghost'
						disabled={busy}
						onClick={() => void signIn.resetPasswordEmailCode.sendCode()}
					>
						Send a new code
					</Button>
					{backButton}
				</form>
			</AuthCard>
		);
	}

	if (step === 'reset-password') {
		return (
			<AuthCard aside={MRG_BRAND} title='Choose a new password'>
				<form onSubmit={handleNewPassword} className='flex flex-col gap-4'>
					<Field
						label='New password'
						type='password'
						autoComplete='new-password'
						required
						minLength={15}
						value={newPassword}
						onChange={(event) => setNewPassword(event.target.value)}
						error={errors.fields.password?.message}
						hint='At least 15 characters.'
					/>
					<FormError message={formError} />
					<SubmitButton busy={busy} busyLabel='Saving…'>
						Save and sign in
					</SubmitButton>
					{backButton}
				</form>
			</AuthCard>
		);
	}

	return (
		<AuthCard
			aside={MRG_BRAND}
			title='Sign in'
			description='Welcome back to MRG Labs OCR.'
			footer='No account yet? Ask your lab administrator to add you.'
		>
			<form onSubmit={handlePassword} className='flex flex-col gap-4'>
				<Field
					label='Email'
					type='email'
					autoComplete='username'
					required
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					error={errors.fields.identifier?.message}
				/>
				<div className='flex flex-col gap-1.5'>
					<Field
						label='Password'
						type='password'
						autoComplete='current-password'
						required
						value={password}
						onChange={(event) => {
							setPassword(event.target.value);
							setBreached(false);
						}}
						// The breach notice below says it more helpfully.
						error={breached ? null : errors.fields.password?.message}
					/>
					<button
						type='button'
						onClick={() => void startReset()}
						disabled={busy}
						className='self-end text-xs text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50'
					>
						Forgot password?
					</button>
				</div>
				<FormError message={formError} />
				{breached ? (
					<div className='flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm'>
						<p>
							This password appears in a known data breach, so it can&apos;t be used
							to sign in any more. Choose a new one: we&apos;ll email you a code.
						</p>
						<Button
							type='button'
							size='lg'
							className='h-10 w-full'
							disabled={busy}
							onClick={() => void startReset()}
						>
							Set a new password
						</Button>
					</div>
				) : (
					<SubmitButton busy={busy} busyLabel='Signing in…'>
						Sign in
					</SubmitButton>
				)}
			</form>
		</AuthCard>
	);
}
