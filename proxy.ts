import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isAuthPage = createRouteMatcher(['/sign-in(.*)']);
const isApiRoute = createRouteMatcher(['/api(.*)']);

// Signed out, the sign-in page is all anyone can see. Sign-up is closed.
// Signed in, it sends people on to the app.
export default clerkMiddleware(async (auth, request) => {
	const { userId, redirectToSignIn } = await auth();

	if (isAuthPage(request)) {
		return userId ? NextResponse.redirect(new URL('/', request.url)) : undefined;
	}
	if (userId) return;

	// The app calls these with fetch and reads JSON, so answer 401 rather than redirecting.
	if (isApiRoute(request)) {
		return NextResponse.json(
			{ error: 'Your session has ended. Sign in again to continue.' },
			{ status: 401 },
		);
	}
	// Comes back to the page they asked for after signing in.
	return redirectToSignIn({ returnBackUrl: request.url });
});

export const config = {
	matcher: [
		'/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		'/(api|trpc)(.*)',
	],
};
