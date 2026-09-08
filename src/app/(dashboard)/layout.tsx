import { Navbar } from "@/components/navbar"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { DashboardClientWrapper } from "@/components/dashboard-client-wrapper"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  let userRole: string | null = null
  let sessionToken: string | null = null

  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })
    userRole = user?.role || null
    sessionToken = session.session.token
  }

  return (
    <div className="dashboard-shell">
      <Navbar initialRole={userRole} />
      <main className="dashboard-content">
        <div className="dashboard-frame">
          <DashboardClientWrapper sessionToken={sessionToken}>
            {children}
          </DashboardClientWrapper>
        </div>
      </main>
    </div>
  )
}
