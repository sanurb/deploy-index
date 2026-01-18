"use client";

import { OrganizationSwitcher } from "@daveyplate/better-auth-ui";
import { ChevronsUpDown } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { useCallback, useMemo } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface OrganizationSwitcherWrapperProps {
  isExpanded: boolean;
}

type SwitcherProps = ComponentProps<typeof OrganizationSwitcher>;
type OnSetActive = NonNullable<SwitcherProps["onSetActive"]>;
type ActiveOrgArg = Parameters<OnSetActive>[0];

function cleanString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function humanizeSlug(slug: string): string {
  // "testing-worskpace" -> "Testing Worskpace"
  return slug
    .trim()
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

type SessionShape =
  | {
      // In your current session payload you only have session + user,
      // so these are typically absent. Keep them optional for forward-compat.
      activeOrganization?: {
        name?: string;
        slug?: string;
        logo?: string;
      } | null;
      organization?: { name?: string; slug?: string; logo?: string } | null;
      session?: { activeOrganizationId?: string } | null;
    }
  | null
  | undefined;

export function OrganizationSwitcherWrapper({
  isExpanded,
}: OrganizationSwitcherWrapperProps) {
  const router = useRouter();
  const params = useParams<{ slug?: string }>();
  const urlSlug = cleanString(params?.slug);

  const { data: sessionData } = authClient.useSession();
  const s = sessionData as SessionShape;

  const activeOrg = s?.activeOrganization ?? s?.organization ?? null;

  const title = useMemo(() => {
    const nameFromSession = cleanString(activeOrg?.name);
    if (nameFromSession) return nameFromSession;

    if (urlSlug) return humanizeSlug(urlSlug);

    return "Workspace";
  }, [activeOrg?.name, urlSlug]);

  const subtitle = useMemo(() => {
    if (urlSlug) return urlSlug;
    return "Switch workspace";
  }, [urlSlug]);

  const logo = cleanString(activeOrg?.logo);
  const initials = useMemo(() => getInitials(title), [title]);

  const handleSetActive = useCallback<OnSetActive>(
    (org: ActiveOrgArg) => {
      // With hidePersonal=true this should not happen, but keep it safe.
      if (!org) return;

      const nextSlug = cleanString((org as { slug?: unknown }).slug);
      router.replace(nextSlug ? `/organization/${nextSlug}/services` : "/app");
    },
    [router]
  );

  const avatarFallbackClass =
    "bg-muted text-foreground/90 ring-1 ring-border/60 text-[11px] font-medium";

  const triggerBase = cn(
    "text-sidebar-foreground",
    "hover:bg-sidebar-accent/60",
    "focus-visible:ring-1 focus-visible:ring-ring/60 focus-visible:ring-offset-0"
  );

  const expandedTrigger = useMemo(() => {
    return (
      <Button
        className={cn(
          triggerBase,
          "h-9 w-full justify-start gap-2 rounded-md px-2",
          "border border-transparent hover:border-border/60",
          "data-[state=open]:bg-sidebar-accent/70 data-[state=open]:border-border/60"
        )}
        type="button"
        variant="ghost"
      >
        <Avatar className="size-7 rounded-md">
          {logo ? <AvatarImage alt={title} src={logo} /> : null}
          <AvatarFallback className={cn("rounded-md", avatarFallbackClass)}>
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium leading-none">
            {title}
          </div>
          <div className="mt-0.5 truncate text-[11px] leading-none text-sidebar-foreground/60">
            {subtitle}
          </div>
        </div>

        <ChevronsUpDown className="size-4 shrink-0 text-sidebar-foreground/45" />
      </Button>
    );
  }, [avatarFallbackClass, initials, logo, subtitle, title, triggerBase]);

  const collapsedButton = useMemo(() => {
    return (
      <Button
        aria-label="Switch workspace"
        className={cn(
          triggerBase,
          "h-9 w-9 rounded-md",
          "border border-transparent hover:border-border/60",
          "data-[state=open]:bg-sidebar-accent/70 data-[state=open]:border-border/60"
        )}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Avatar className="size-7 rounded-md">
          {logo ? <AvatarImage alt={title} src={logo} /> : null}
          <AvatarFallback className={cn("rounded-md", avatarFallbackClass)}>
            {initials}
          </AvatarFallback>
        </Avatar>
      </Button>
    );
  }, [avatarFallbackClass, initials, logo, title, triggerBase]);

  const collapsedTrigger = useMemo(() => {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{collapsedButton}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          Switch workspace
        </TooltipContent>
      </Tooltip>
    );
  }, [collapsedButton]);

  return (
    <OrganizationSwitcher
      align="start"
      classNames={{
        trigger: { base: "hidden" },
        content: {
          base: cn(
            "w-[280px] rounded-lg border border-border/60 bg-popover text-popover-foreground shadow-xl",
            "overflow-hidden"
          ),
          menuItem: cn("gap-2", "text-[13px] leading-none", "[&_svg]:size-4"),
        },
      }}
      hidePersonal
      localization={{
        ORGANIZATION: "Workspace",
        CREATE_ORGANIZATION: "New workspace",
        PERSONAL_ACCOUNT: "Personal workspace",
      }}
      onSetActive={handleSetActive}
      side="right"
      sideOffset={8}
      trigger={isExpanded ? expandedTrigger : collapsedTrigger}
    />
  );
}
