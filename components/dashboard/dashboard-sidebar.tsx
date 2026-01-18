"use client";

import { SignedIn, SignedOut, UserButton } from "@daveyplate/better-auth-ui";
import { Building2, Mail, Package, Settings, Users } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/animate-ui/components/radix/sidebar";
import { isRouteActive } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { OrganizationSwitcherWrapper } from "./organization-switcher-wrapper";

type NavigationItem = {
  readonly title: string;
  readonly path: string;
  readonly icon: typeof Package;
};

const NAVIGATION_ITEMS: NavigationItem[] = [
  { title: "Services", path: "services", icon: Package },
  { title: "Organization", path: "settings", icon: Building2 },
  { title: "Members", path: "members", icon: Users },
  { title: "Invitations", path: "invitations", icon: Mail },
] as const;

/* ---------------- User (TOP) ---------------- */

function UserCluster() {
  const { open } = useSidebar();

  return (
    <div
      className={cn(
        "flex items-center",
        open ? "justify-start px-1" : "justify-center"
      )}
    >
      <SignedIn>
        <UserButton size="icon" />
      </SignedIn>

      <SignedOut>
        {open && (
          <Link
            className="text-[13px] text-sidebar-foreground/80 hover:text-sidebar-foreground"
            href="/auth/sign-in"
          >
            Sign in
          </Link>
        )}
      </SignedOut>
    </div>
  );
}

/* ---------------- Navigation ---------------- */

function WorkspaceNav() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug;
  const pathname = usePathname();
  const { open } = useSidebar();

  // Only render navigation if we're in an organization context
  if (!slug) {
    return null;
  }

  return (
    <SidebarGroup>
      {open && (
        <SidebarGroupLabel className="px-2 text-[11px] text-sidebar-foreground/60">
          Workspace
        </SidebarGroupLabel>
      )}

      <SidebarMenu>
        {NAVIGATION_ITEMS.map(({ title, path, icon: Icon }) => {
          const href = `/organization/${slug}/${path}`;
          const isActive = isRouteActive(pathname, href);

          return (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton
                asChild
                className={cn(
                  "h-9",
                  open ? "justify-start gap-2 px-2" : "justify-center px-0",
                  "data-[active=true]:bg-sidebar-accent",
                  "data-[active=true]:text-sidebar-accent-foreground"
                )}
                isActive={isActive}
                tooltip={title}
              >
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center",
                    open ? "w-full" : "w-9 justify-center"
                  )}
                  href={href}
                >
                  <Icon className="size-4 shrink-0" />

                  {open && (
                    <span className="ml-2 truncate text-[13px]">{title}</span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

/* ---------------- Footer (ORG) ---------------- */

function FooterCluster() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug;
  const { open } = useSidebar();

  // Only show organization switcher in organization context
  if (!slug) {
    return null;
  }

  return (
    <div className={cn(open ? "px-1" : "flex justify-center")}>
      <OrganizationSwitcherWrapper isExpanded={open} />
    </div>
  );
}

/* ---------------- Sidebar Root ---------------- */

export default function DashboardSidebar() {
  return (
    <Sidebar
      className={cn(
        "border-r border-border/60",
        "bg-sidebar/60 backdrop-blur supports-backdrop-filter:bg-sidebar/40"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="px-2 py-2">
        <UserCluster />
        <SidebarSeparator className="my-2 opacity-0" />
      </SidebarHeader>

      <SidebarContent className="px-2">
        <WorkspaceNav />
      </SidebarContent>

      <SidebarFooter className="px-2 py-2">
        <SidebarSeparator className="my-2 bg-border/40" />
        <FooterCluster />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
