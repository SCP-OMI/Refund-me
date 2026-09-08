import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function StudentLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const headersList = await headers()

    const session = await auth.api.getSession({
        headers: headersList
    })

    if (!session) {
        redirect("/login?callbackUrl=/student")
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
    })

    const pathname = headersList.get("x-pathname") || headersList.get("x-invoke-path") || ""

    const isStaff = user?.role === "STAFF" 
    const isCreatePage = pathname.includes("/student/create")

    if (isStaff && !isCreatePage) {
        redirect("/staff")
    }

    return <>{children}</>
}
