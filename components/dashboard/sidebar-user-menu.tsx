// components/dashboard/sidebar-user-menu.tsx
"use client";

import { SignedIn, SignedOut, UserButton } from "@daveyplate/better-auth-ui";
import Link from "next/link";

import {
  SidebarMenuButton,
  useSidebar,
} from "@/components/animate-ui/components/radix/sidebar";
import { cn } from "@/lib/utils";

export function SidebarUserMenu() {
  const { open } = useSidebar();

  return (
    <div className="w-full">
      <SignedIn>
        <SidebarMenuButton
          className={cn(
            "h-10 min-w-0",
            "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
            "justify-start gap-2"
          )}
          size="lg"
        >
          <span className="shrink-0">
            <UserButton size="icon" />
          </span>

          <span
            aria-hidden={!open}
            className={cn(
              "min-w-0 flex-1 truncate text-left text-sm",
              "group-data-[collapsible=icon]/sidebar-wrapper:hidden"
            )}
          >
            Account
          </span>
        </SidebarMenuButton>
      </SignedIn>

      <SignedOut>
        <SidebarMenuButton asChild className="h-10" size="lg">
          <Link className="min-w-0 truncate" href="/auth/sign-in">
            Sign In
          </Link>
        </SidebarMenuButton>
      </SignedOut>
    </div>
  );
}
