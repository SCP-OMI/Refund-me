"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function getUserRole() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) return null

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
    })

    return user?.role || null
}
