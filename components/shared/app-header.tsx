"use client";

import { SignedIn, SignedOut, UserButton } from "@daveyplate/better-auth-ui";
import Image from "next/image";
import Link from "next/link";

export function AppHeader() {
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
        <div className="min-w-0">
          <h2 className="truncate font-sans text-base text-foreground leading-none tracking-tight sm:text-lg md:text-xl">
            <span className="font-normal text-lg">Deploy</span>
            <span className="font-extrabold text-lg">Index</span>
          </h2>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <SignedIn>
          <UserButton size="icon" />
        </SignedIn>

        <SignedOut>
          <Link href="/auth/sign-in">Sign In</Link>
        </SignedOut>
      </div>
    </header>
  );
}
