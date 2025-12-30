"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"

export type Theme = "dark" | "light" | "system"

interface ThemeProviderProps {
  readonly children: React.ReactNode
  readonly defaultTheme?: Theme
  readonly storageKey?: string
  readonly attribute?: string
  readonly enableSystem?: boolean
}

interface ThemeProviderState {
  readonly theme: Theme
  readonly resolvedTheme: "dark" | "light"
  readonly setTheme: (theme: Theme) => void
}

const STORAGE_KEY_DEFAULT = "ui-theme"
const ATTRIBUTE_DEFAULT = "class"
const ENABLE_SYSTEM_DEFAULT = true

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {
    // No-op
  },
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") {
    return "light"
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getStoredTheme(storageKey: string, defaultTheme: Theme): Theme {
  if (typeof window === "undefined") {
    return defaultTheme
  }

  try {
    const stored = localStorage.getItem(storageKey)
    if (stored === "dark" || stored === "light" || stored === "system") {
      return stored
    }
  } catch {
    // localStorage may be unavailable
  }

  return defaultTheme
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = STORAGE_KEY_DEFAULT,
  attribute = ATTRIBUTE_DEFAULT,
  enableSystem = ENABLE_SYSTEM_DEFAULT,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = getStoredTheme(storageKey, defaultTheme)
    setThemeState(stored)
    const initialResolved = stored === "system" ? getSystemTheme() : stored
    setResolvedTheme(initialResolved)
  }, [storageKey, defaultTheme])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) {
      return
    }

    const root = window.document.documentElement
    const currentTheme = theme === "system" ? getSystemTheme() : theme

    root.classList.remove("light", "dark")

    if (attribute === "class") {
      root.classList.add(currentTheme)
    } else {
      root.setAttribute(attribute, currentTheme)
    }

    setResolvedTheme(currentTheme)
  }, [theme, attribute, mounted])

  useEffect(() => {
    if (!mounted || !enableSystem || theme !== "system") {
      return
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = (e: MediaQueryListEvent) => {
      const root = window.document.documentElement
      const newTheme = e.matches ? "dark" : "light"

      root.classList.remove("light", "dark")
      root.classList.add(newTheme)
      setResolvedTheme(newTheme)
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme, enableSystem, mounted])

  const setTheme = useCallback(
    (newTheme: Theme) => {
      try {
        localStorage.setItem(storageKey, newTheme)
      } catch {
        // localStorage may be unavailable
      }
      setThemeState(newTheme)
    },
    [storageKey],
  )

  const value: ThemeProviderState = {
    theme,
    resolvedTheme,
    setTheme,
  }

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>
}

export function useTheme(): ThemeProviderState {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}