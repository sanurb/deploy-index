"use client"

import { useState, useCallback } from "react"
import { AnimatePresence, motion as m, MotionConfig, type Variants } from "motion/react"
import { useTheme } from "@/components/theme-provider"

const ANIMATION_DURATION_MS = 600
const SPRING_STIFFNESS = 300
const SPRING_DAMPING = 20
const TRANSITION_DURATION = 0.5

const modeVariants: Variants = {
  initial: {
    y: -20,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: SPRING_STIFFNESS,
      damping: SPRING_DAMPING,
      duration: 0.3,
    },
  },
  hidden: {
    y: 20,
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
}

const containerVariants: Variants = {
  hover: {
    scale: 1.05,
  },
  tap: {
    scale: 0.95,
  },
}

export default function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [isAnimating, setIsAnimating] = useState(false)

  const handleToggle = useCallback(() => {
    setIsAnimating(true)
    const nextTheme = resolvedTheme === "light" ? "dark" : "light"
    setTheme(nextTheme)

    setTimeout(() => {
      setIsAnimating(false)
    }, ANIMATION_DURATION_MS)
  }, [resolvedTheme, setTheme])

  const isLight = resolvedTheme === "light"

  return (
    <MotionConfig
      transition={{
        ease: [0.1, 0.9, 0.2, 1],
        duration: TRANSITION_DURATION,
      }}
    >
      <m.button
        type="button"
        variants={containerVariants}
        whileHover="hover"
        whileTap="tap"
        className="rounded-full bg-muted flex items-center justify-center gap-1.5 py-1.5 px-2 sm:px-3 overflow-hidden outline-none relative h-8 sm:h-9 min-w-8 sm:min-w-auto"
        onClick={handleToggle}
        aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      >
        <m.div className="size-6 sm:size-7 rounded-full flex items-center justify-center relative shrink-0" layout>
          <m.svg
            xmlns="http://www.w3.org/2000/svg"
            width="100"
            height="100"
            viewBox="0 0 100 100"
            fill="none"
            className="size-5 sm:size-6 will-change-transform"
            animate={{
              rotate: isLight ? 0 : 180,
              scale: isAnimating ? [1, 1.1, 1] : 1,
            }}
            transition={{
              duration: TRANSITION_DURATION,
            }}
          >
            <rect width="100" height="100" />
            <m.path
              d="M50 18C58.4869 18 66.6262 21.3714 72.6274 27.3726C78.6286 33.3737 82 41.513 82 50C82 58.4869 78.6286 66.6262 72.6275 72.6274C66.6263 78.6286 58.487 82 50.0001 82L50 50L50 18Z"
              className="will-change-transform fill-primary"
              animate={{
                fillOpacity: isAnimating ? [1, 0.7, 1] : 1,
              }}
              transition={{
                duration: 0.3,
                times: [0, 0.5, 1],
              }}
            />
            <m.circle
              cx="50"
              cy="50"
              r="30"
              className="will-change-transform stroke-primary"
              strokeWidth="4"
              animate={{
                strokeWidth: isAnimating ? [4, 5, 4] : 4,
              }}
              transition={{
                duration: TRANSITION_DURATION,
                times: [0, 0.5, 1],
              }}
            />
            <m.circle
              cx="50"
              cy="50"
              r="12"
              className="will-change-transform fill-primary"
              animate={{
                scale: isAnimating ? [1, 0.9, 1] : 1,
              }}
              transition={{
                duration: TRANSITION_DURATION,
                times: [0, 0.5, 1],
              }}
            />
            <m.path
              d="M50 62C53.1826 62 56.2348 60.7357 58.4853 58.4853C60.7357 56.2348 62 53.1826 62 50C62 46.8174 60.7357 43.7652 58.4853 41.5147C56.2348 39.2643 53.1826 38 50 38L50 50L50 62Z"
              className="will-change-transform fill-primary-foreground"
              animate={{
                fillOpacity: isAnimating ? [1, 0.7, 1] : 1,
              }}
              transition={{
                duration: TRANSITION_DURATION,
                times: [0, 0.5, 1],
              }}
            />
          </m.svg>
        </m.div>

        <div className="hidden sm:flex items-center gap-1 font-medium text-xs">
          <AnimatePresence mode="wait">
            {isLight ? (
              <m.span
                key="light"
                variants={modeVariants}
                initial="initial"
                animate="visible"
                exit="hidden"
                className="font-medium text-primary"
              >
                Light
              </m.span>
            ) : (
              <m.span
                key="dark"
                variants={modeVariants}
                initial="initial"
                animate="visible"
                exit="hidden"
                className="font-medium text-primary"
              >
                Dark
              </m.span>
            )}
          </AnimatePresence>
          <m.span
            animate={{
              opacity: isAnimating ? [1, 0.7, 1] : 1,
            }}
            transition={{
              duration: 0.3,
              times: [0, 0.5, 1],
            }}
          >
            Mode
          </m.span>
        </div>
      </m.button>
    </MotionConfig>
  )
}