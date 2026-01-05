"use client";

import { UserButton } from "@daveyplate/better-auth-ui";
import Image from "next/image";
import Link from "next/link";
import ModeToggle from "@/components/animations/mode-toggle";
import { useMounted } from "@/hooks/use-mounted";

export function AppHeader() {
  const mounted = useMounted();

  return (
    <header className="sticky top-0 z-50 flex h-12 justify-between border-b bg-background/60 px-4 backdrop-blur md:h-14 md:px-6">
      <Link className="flex items-center gap-2" href="/">
        <Image
          alt="Deploy Index"
          className="size-5"
          height={32}
          priority
          src="/icon.svg"
          width={32}
        />
        <span className="font-extrabold">Deploy</span>
        <span className="font-normal">Index</span>
      </Link>

      <div className="flex items-center gap-2">
        {mounted ? (
          <ModeToggle />
        ) : (
          <div className="h-8 min-w-8 sm:h-9 sm:min-w-auto" />
        )}
        <UserButton size="icon" />
      </div>
    </header>
  );
}
