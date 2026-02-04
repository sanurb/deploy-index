"use client";

import { SignedIn, SignedOut, UserButton } from "@daveyplate/better-auth-ui";
import { Building2, Mail, Package, Users } from "lucide-react";
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

  const sharedContentBase = cn(
    "rounded-md border border-border/60 shadow-md overflow-hidden",
    "bg-popover text-popover-foreground"
  );

  const sharedMenuItem = cn(
    "text-popover-foreground",
    "focus:bg-accent focus:text-accent-foreground",
    "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
  );

  const classNamesExpanded = {
    base: cn("w-full min-w-0"),
    trigger: {
      base: cn(
        // override shadcn Button defaults (bg-primary, text-primary-foreground, etc.)
        "!bg-transparent !text-sidebar-foreground !shadow-none",
        "w-full min-w-0 h-fit",
        "flex items-center gap-2 justify-start",
        "rounded-md px-2 py-1.5",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
      ),
      avatar: {
        base: cn("shrink-0 size-8 rounded-full ring-1 ring-border/50"),
        image: cn("object-cover"),
        fallback: cn("bg-muted text-foreground uppercase"),
      },
      user: {
        base: cn("min-w-0 flex-1 text-left text-sidebar-foreground"),
        name: cn("truncate text-sm font-semibold leading-tight"),
        email: cn("truncate text-xs text-sidebar-foreground/70"),
      },
      skeleton: cn("w-full bg-sidebar-accent/30"),
    },
    content: {
      base: sharedContentBase,
      user: {
        base: cn("text-popover-foreground"),
        name: cn("text-sm font-semibold"),
        email: cn("text-xs text-muted-foreground"),
      },
      avatar: {
        base: cn("rounded-full ring-1 ring-border/50"),
        image: cn("object-cover"),
        fallback: cn("bg-muted text-foreground uppercase"),
      },
      menuItem: sharedMenuItem,
      separator: cn("bg-border/60"),
    },
    skeleton: cn("bg-sidebar-accent/30"),
  };

  const classNamesCollapsed = {
    base: cn("w-auto"),
    trigger: {
      base: cn(
        // force perfect circle button, avoid stretching
        "!bg-transparent !text-sidebar-foreground !shadow-none",
        "size-10 p-0",
        "flex items-center justify-center",
        "rounded-md",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
      ),
      avatar: {
        base: cn("size-6 rounded-full ring-1 ring-border/50"),
        image: cn("object-cover"),
        fallback: cn("bg-muted text-foreground uppercase"),
      },
      user: {
        base: cn("sr-only"),
        name: cn("sr-only"),
        email: cn("sr-only"),
      },
      skeleton: cn("size-10 bg-sidebar-accent/30 rounded-md"),
    },
    content: {
      base: sharedContentBase,
      user: {
        base: cn("text-popover-foreground"),
        name: cn("text-sm font-semibold"),
        email: cn("text-xs text-muted-foreground"),
      },
      avatar: {
        base: cn("rounded-full ring-1 ring-border/50"),
        image: cn("object-cover"),
        fallback: cn("bg-muted text-foreground uppercase"),
      },
      menuItem: sharedMenuItem,
      separator: cn("bg-border/60"),
    },
    skeleton: cn("bg-sidebar-accent/30"),
  };

  return (
    <div
      className={cn(
        "w-full flex items-center",
        open ? "justify-start" : "justify-center"
      )}
    >
      <SignedIn>
        <UserButton
          classNames={open ? classNamesExpanded : classNamesCollapsed}
          size={open ? "sm" : "icon"}
        />
      </SignedIn>

      <SignedOut>
        {open ? (
          <Link
            className={cn(
              "w-full min-w-0",
              "rounded-md px-2 py-1.5",
              "text-[13px] text-sidebar-foreground/80",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "transition-colors"
            )}
            href="/auth/sign-in"
          >
            Sign in
          </Link>
        ) : null}
      </SignedOut>
    </div>
  );
}

/* ---------------- Navigation ---------------- */

function WorkspaceNav() {
  const params = useParams();
  const slug = params?.slug;
  const pathname = usePathname();
  const { open } = useSidebar();

  if (!slug) return null;

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
                    open ? "w-full min-w-0" : "w-9 justify-center"
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
  const params = useParams();
  const slug = params?.slug;
  const { open } = useSidebar();

  if (!slug) return null;

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
