import { type NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_KEY } from "./auth/core/constants";

const redirectWhenAuthenticatedPrefixes = [
	"/sign-in",
	"/sign-up",
	"/forgot-password",
	"/reset-password",
];

const protectedRoutePrefixes = ["/admin", "/dashboard", "/app"];
const protectedExactRoutes = new Set<string>();

function matchesRoute(pathname: string, prefixes: string[]) {
	return prefixes.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const redirectAuthenticated = matchesRoute(
		pathname,
		redirectWhenAuthenticatedPrefixes,
	);
	const isProtectedPrefix = matchesRoute(pathname, protectedRoutePrefixes);
	const isProtectedRoute =
		isProtectedPrefix || protectedExactRoutes.has(pathname);
	const hasSessionCookie = request.cookies.has(SESSION_COOKIE_KEY);

	if (redirectAuthenticated && hasSessionCookie) {
		const redirectToHome = new URL("/app", request.url);
		return NextResponse.redirect(redirectToHome);
	}

	if (!hasSessionCookie && isProtectedRoute) {
		const signInUrl = request.nextUrl.clone();
		signInUrl.pathname = "/sign-in";
		signInUrl.searchParams.set("redirect", pathname);
		return NextResponse.redirect(signInUrl);
	}

	// Admin role verification happens during page rendering to avoid DB access in edge runtime.
	return NextResponse.next();
}

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
	],
};
