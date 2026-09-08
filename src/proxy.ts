import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    const sessionCookie = request.cookies.get("__Secure-better-auth.session_token")
        || request.cookies.get("better-auth.session_token");
    const { pathname, searchParams } = request.nextUrl;

    const publicRoutes = ["/api/auth", "/_next", "/favicon.ico"];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    if (isPublicRoute) {
        return NextResponse.next();
    }

    // Don't redirect from login if there's a callbackUrl - let the user authenticate first
    // The cookie might be stale/invalid, so we shouldn't assume it's valid
    if (sessionCookie && pathname === "/login" && !searchParams.has("callbackUrl")) {
        return NextResponse.redirect(new URL("/student", request.url));
    }

    if (pathname === "/login") {
        return NextResponse.next();
    }

    const protectedRoutes = ["/student", "/staff", "/dashboard"];
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    if (isProtectedRoute && !sessionCookie) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (pathname === "/") {
        if (sessionCookie) {
            return NextResponse.redirect(new URL("/student", request.url));
        } else {
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\..*|uploads).*)",
    ],
};
