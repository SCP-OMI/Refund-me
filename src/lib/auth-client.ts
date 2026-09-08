import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    // Ensure credentials are sent with requests (needed for cookies in private windows)
    fetchOptions: {
        credentials: "include",
    },
})

export const { signIn, signOut, useSession } = authClient;