"use client"

import type { ReactNode } from "react"
import { AuthUIProvider } from "@daveyplate/better-auth-ui"
import { useInstantOptions } from "@daveyplate/better-auth-ui/instantdb"
import { useInstantAuth } from "@daveyplate/better-auth-instantdb"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { db } from "@/lib/db"

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { data: sessionData, isPending } = authClient.useSession()
  
  useInstantAuth({ 
    db: db as any, 
    sessionData: sessionData ?? undefined, 
    isPending 
  })
  const { user } = db.useAuth()
  
  const { hooks, mutators } = useInstantOptions({
    db: db as any,
    sessionData: sessionData ?? undefined,
    isPending,
    user,
    usePlural: true,
  })

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => {
        router.refresh()
      }}
      Link={Link}
      hooks={hooks}
      mutators={mutators}
    >
      {children}
    </AuthUIProvider>
  )
}

