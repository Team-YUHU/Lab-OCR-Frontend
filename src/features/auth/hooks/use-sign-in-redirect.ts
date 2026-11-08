import { useRouter, useSearchParams } from 'next/navigation';
import type { SetActiveNavigate } from '@clerk/nextjs/types';

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
