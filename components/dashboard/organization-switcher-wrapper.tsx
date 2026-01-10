"use client";

import { OrganizationSwitcher } from "@daveyplate/better-auth-ui";
import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";

interface OrganizationSwitcherWrapperProps {
  isExpanded: boolean;
}

export function OrganizationSwitcherWrapper({
  isExpanded,
}: OrganizationSwitcherWrapperProps) {
  const { data: sessionData } = authClient.useSession();
  const activeOrganization =
    (sessionData as { activeOrganization?: { name?: string; logo?: string } })
      ?.activeOrganization ?? null;
  const [isOpen, setIsOpen] = useState(false);

  const orgName = activeOrganization?.name ?? "Personal";
  const orgLogo = activeOrganization?.logo;
  const initials = orgName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (isExpanded) {
    return (
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <PopoverTrigger asChild>
          <Button
            className="w-full justify-start gap-3 border-border bg-card px-3 py-2 hover:border-border hover:bg-muted"
            variant="outline"
          >
            <Avatar className="size-8">
              {orgLogo ? <AvatarImage alt={orgName} src={orgLogo} /> : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col items-start overflow-hidden">
              <span className="truncate font-medium text-sm">{orgName}</span>
              <span className="text-muted-foreground text-xs">
                {activeOrganization ? "Organization" : "Personal account"}
              </span>
            </div>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[280px] p-0"
          side="right"
          sideOffset={8}
        >
          <OrganizationSwitcher />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              className="size-11 rounded-lg border-border bg-card hover:border-border hover:bg-muted"
              size="icon"
              variant="ghost"
            >
              <Avatar className="size-7">
                {orgLogo ? <AvatarImage alt={orgName} src={orgLogo} /> : null}
                <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          Switch organization
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        className="w-[280px] p-0"
        side="right"
        sideOffset={8}
      >
        <OrganizationSwitcher />
      </PopoverContent>
    </Popover>
  );
}
