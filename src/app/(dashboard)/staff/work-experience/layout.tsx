import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canAccessWorkExperience } from "@/lib/work-experience-access"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function WorkExperienceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login?callbackUrl=/staff/work-experience")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, login: true },
  })
  if (!user || !canAccessWorkExperience(user)) {
    redirect("/staff?unauthorized=work-experience")
  }

  return children
}
