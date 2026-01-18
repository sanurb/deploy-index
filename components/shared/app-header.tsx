//components/shared/app-header.tsx
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
        <div className="typography min-w-0">
          <span className="font-normal text-lg">Deploy</span>
          <span className="font-extrabold text-lg">Index</span>
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
