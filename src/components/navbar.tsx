"use client"

import { getUserRole } from "@/actions/user"
import { NotificationBell } from "@/components/notification-bell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut, useSession } from "@/lib/auth-client"
import { Award, CheckCircle2, FileText, Info, LogOut, Menu, Plus, Upload, X } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const studentLinks = [
  { href: "/student", label: "Overview" },
  { href: "/student/history", label: "Request history" },
]

const staffLinks = [
  { href: "/staff", label: "Review queue" },
  { href: "/staff/work-experience", label: "Work experience" },
  { href: "/staff/analytics", label: "Analytics" },
]

function BrandMark() {
  return (
    <svg width="76" height="20" viewBox="0 0 76 20" fill="none" aria-label="1337">
      <path d="M2.833 17.662h3.091V2.338H2.318v3.117H0V0h8.757v17.662h3.091V20H2.833v-2.338Z" fill="currentColor" />
      <path d="M21.379 17.662h9.272V10.91h-8.5V8.57h8.5V2.338h-9.272V0h12.106v20H21.379v-2.338Z" fill="currentColor" />
      <path d="M42.242 17.662h9.273V10.91h-8.5V8.57h8.5V2.338h-9.273V0h12.106v20H42.242v-2.338Z" fill="currentColor" />
      <path d="M72.636 2.338h-7.728v4.935H62.59V0h12.621v20h-2.575V2.338Z" fill="currentColor" />
    </svg>
  )
}

export function Navbar({ initialRole }: { initialRole: string | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(initialRole)

  useEffect(() => {
    if (session) getUserRole().then(setUserRole)
  }, [session])

  useEffect(() => {
    if (!session) return
    const hasSeenWelcome = localStorage.getItem("refunds-welcome-seen")
    if (!hasSeenWelcome) {
      const timer = window.setTimeout(() => setAboutOpen(true), 0)
      localStorage.setItem("refunds-welcome-seen", "true")
      return () => window.clearTimeout(timer)
    }
  }, [session])

  const links = userRole === "STAFF" ? staffLinks : studentLinks

  const isActive = (href: string) => {
    const isBase = href === "/staff" || href === "/student"
    return isBase ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
  }

  const handleSignOut = async () => {
    document.cookie = "better-auth.session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "__Secure-better-auth.session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure;"
    try {
      await signOut()
    } catch (error) {
      console.error("Sign out error:", error)
    }
    window.location.href = "/login"
  }

  return (
    <>
      <header className="app-navbar">
        <div className="app-navbar-inner">
          <Link className="app-navbar-brand" href={userRole === "STAFF" ? "/staff" : "/student"}>
            <BrandMark />
            <span className="brand-divider" aria-hidden="true" />
            <span>Refunds</span>
          </Link>

          {userRole && (
            <nav className="desktop-nav" aria-label="Primary navigation">
              {links.map((link) => (
                <Link key={link.href} href={link.href} data-active={isActive(link.href)}>{link.label}</Link>
              ))}
            </nav>
          )}

          <div className="navbar-actions">
            {userRole && (
              <Link className="app-navbar-action" href="/student/create">
                <Plus aria-hidden="true" /><span>New request</span>
              </Link>
            )}
            {session && <div className="desktop-only"><NotificationBell /></div>}
            {session && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="profile-trigger" aria-label="Open profile menu">
                    <Avatar>
                      <AvatarImage src={session.user.image || ""} alt={session.user.name} />
                      <AvatarFallback>{session.user.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="profile-menu" align="end" sideOffset={12}>
                  <DropdownMenuLabel><strong>{session.user.name}</strong><span>{session.user.email}</span></DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAboutOpen(true)}><Info /> About Refunds</DropdownMenuItem>
                  {userRole === "STAFF" && (
                    <DropdownMenuItem onClick={() => router.push("/staff/certificates")}><Award /> Manage certificates</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="danger-menu-item" onClick={handleSignOut}><LogOut /> Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <button
              className="mobile-menu-trigger"
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="mobile-menu-scrim" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu-panel" onClick={(event) => event.stopPropagation()}>
            <nav aria-label="Mobile navigation">
              {userRole && links.map((link) => (
                <Link key={link.href} href={link.href} data-active={isActive(link.href)} onClick={() => setMobileMenuOpen(false)}>{link.label}</Link>
              ))}
            </nav>
            {session && (
              <div className="mobile-account">
                <div><strong>{session.user.name}</strong><span>{session.user.email}</span></div>
                <div className="mobile-account-actions">
                  <NotificationBell />
                  <button type="button" onClick={() => { setMobileMenuOpen(false); setAboutOpen(true) }} aria-label="About Refunds"><Info /></button>
                  <button type="button" onClick={handleSignOut} aria-label="Log out"><LogOut /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent showCloseButton={false} className="about-dialog">
          <DialogHeader><DialogTitle><BrandMark /><span>How reimbursement moves</span></DialogTitle></DialogHeader>
          <div className="about-flow">
            <div><FileText /><span><strong>Send the estimate</strong><small>Tell finance what the expense is for.</small></span></div>
            <div><Upload /><span><strong>Add proof of payment</strong><small>Upload the receipt once the estimate is approved.</small></span></div>
            <div><CheckCircle2 /><span><strong>Collect the refund</strong><small>Follow the status until payment is ready.</small></span></div>
          </div>
          <button className="dialog-primary" type="button" onClick={() => setAboutOpen(false)}>Got it</button>
        </DialogContent>
      </Dialog>
    </>
  )
}
