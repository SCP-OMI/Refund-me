import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const { POST, GET: betterAuthGET } = toNextJsHandler(auth);

export { POST };

export async function GET(request: NextRequest) {
    const url = new URL(request.url);

    if (url.pathname.includes("/error")) {
        const error = url.searchParams.get("error");
        const publicOrigin =
            process.env.BETTER_AUTH_URL ||
            process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
            request.nextUrl.origin;
        const errorUrl = new URL("/error", publicOrigin);
        errorUrl.searchParams.set("error", error || "unknown_error");

        return NextResponse.redirect(errorUrl);
    }

    return betterAuthGET(request);
}
