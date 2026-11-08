import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SignInForm } from '@/features/auth/components/sign-in-form';

export const metadata: Metadata = { title: 'Sign in · MRG Labs OCR' };

export default function SignInPage() {
	// The form reads ?redirect_url=, which needs a Suspense boundary.
	return (
		<Suspense>
			<SignInForm />
		</Suspense>
	);
}
