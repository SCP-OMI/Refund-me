
"use client"

import {
  Home,
  Inbox,
  Settings,
  Users,
  FileText,
  CreditCard,
  PlusCircle,
  BarChart,
  Command,
  LogOut
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useSession, signOut } from "@/lib/auth-client" // Using Better-Auth hooks
import { canAccessWorkExperience } from "@/lib/work-experience-access"

// Menu items.
const studentItems = [
  { title: "My Requests", url: "/student", icon: Home },
  { title: "History", url: "/student/history", icon: FileText },
  { title: "New Request", url: "/student/create", icon: PlusCircle },
  { title: "Settings", url: "/student/settings", icon: Settings },
]

const staffItems = [
  { title: "Inbox", url: "/staff", icon: Inbox },
  { title: "Active Requests", url: "/staff/active", icon: FileText },
  { title: "Completed", url: "/staff/payouts", icon: CreditCard },
  { title: "Manage Users", url: "/staff/users", icon: Users },
  { title: "Work Experience", url: "/staff/work-experience", icon: CreditCard },
  { title: "Analytics", url: "/staff/analytics", icon: BarChart },
]

export function AppSidebar() {
  const { data: session } = useSession()
  const user = session?.user
  const canSeeWorkExperience = canAccessWorkExperience(
    (user as { role?: string | null; login?: string | null } | undefined) ?? {},
  )

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-background/60 backdrop-blur-xl">
      <SidebarHeader>
        <div className="flex items-center gap-2 p-3 text-primary">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Command className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold">RefundMe</span>
                <span className="truncate text-xs text-muted-foreground">Premium Portal</span>
            </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel>Student Space</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {studentItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild size="sm" tooltip={item.title} className="hover:bg-primary/10 hover:text-primary transition-colors h-9">
                    <a href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="mx-2 my-2 bg-border/50" />

        <SidebarGroup>
          <SidebarGroupLabel>Staff Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {staffItems
                .filter(
                  (item) =>
                    item.url !== "/staff/work-experience" || canSeeWorkExperience,
                )
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild size="sm" tooltip={item.title} className="hover:bg-primary/10 hover:text-primary transition-colors">
                      <a href={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-muted/50"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                    <AvatarFallback className="rounded-lg">
                        {user?.name?.slice(0, 2).toUpperCase() || "CN"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name || "Guest User"}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email || "guest@example.com"}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={async () => {
                    await signOut()
                }}>
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
