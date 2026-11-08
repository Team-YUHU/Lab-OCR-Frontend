// Turning Clerk's errors into messages people can act on.

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
