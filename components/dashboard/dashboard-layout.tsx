"use client";

import {
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Mail,
  Menu,
  Package,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/shared/app-header";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { isRouteActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

import { OrganizationSwitcherWrapper } from "./organization-switcher-wrapper";
import { SidebarItem } from "./sidebar-item";

const NAVIGATION_ITEMS = [
  {
    title: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Services",
    href: "/dashboard/services",
    icon: Package,
  },
  {
    title: "Organization",
    href: "/dashboard/organization",
    icon: Building2,
  },
  {
    title: "Members",
    href: "/dashboard/members",
    icon: Users,
  },
  {
    title: "Invitations",
    href: "/dashboard/invitations",
    icon: Mail,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

const SIDEBAR_COLLAPSED_KEY = "sidebar:collapsed";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const collapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    setIsCollapsed(collapsed);
  }, []);

  const handleToggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newCollapsed));
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop: Persistent sidebar */}
        <aside
          className={cn(
            "hidden h-[calc(100dvh-3.5rem)] flex-col border-border border-r bg-sidebar transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] md:flex",
            isCollapsed ? "w-[72px]" : "w-[260px]"
          )}
        >
          <div className="flex flex-1 flex-col overflow-y-auto py-3">
            <nav className="flex flex-1 flex-col gap-1 px-2">
              {NAVIGATION_ITEMS.map((item) => {
                const isActive = isRouteActive(pathname, item.href);
                return (
                  <SidebarItem
                    href={item.href}
                    icon={item.icon}
                    isActive={isActive}
                    isCollapsed={isCollapsed}
                    key={item.href}
                    label={item.title}
                  />
                );
              })}
            </nav>

            <div className="mt-auto border-border border-t p-2">
              <OrganizationSwitcherWrapper isExpanded={!isCollapsed} />
            </div>

            {/* Collapse/Expand Toggle */}
            <div className="border-border border-t p-2">
              <Button
                className="w-full justify-start gap-3"
                onClick={handleToggle}
                size="sm"
                variant="ghost"
              >
                {isCollapsed ? (
                  <ChevronRight className="size-4" />
                ) : (
                  <>
                    <ChevronLeft className="size-4" />
                    <span className="text-muted-foreground text-xs">
                      Collapse
                    </span>
                  </>
                )}
                <span className="sr-only">
                  {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                </span>
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              className="fixed right-4 bottom-4 z-50 h-12 w-12 rounded-full shadow-lg md:hidden"
              size="icon"
              variant="ghost"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[300px] sm:w-[400px]" side="left">
            <nav className="mt-4 flex flex-col gap-1">
              {NAVIGATION_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = isRouteActive(pathname, item.href);
                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    <Icon className="h-5 w-5" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
