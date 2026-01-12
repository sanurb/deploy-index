"use client";

import {
  AnimatePresence,
  MotionConfig,
  motion as m,
  type Variants,
} from "motion/react";
import { useCallback, useState } from "react";
import { useTheme } from "@/components/theme-provider";

const ANIMATION_DURATION_MS = 600;
const SPRING_STIFFNESS = 300;
const SPRING_DAMPING = 20;
const TRANSITION_DURATION = 0.5;

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
};

const containerVariants: Variants = {
  hover: {
    scale: 1.05,
  },
  tap: {
    scale: 0.95,
  },
};

export default function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = useCallback(() => {
    setIsAnimating(true);
    const nextTheme = resolvedTheme === "light" ? "dark" : "light";
    setTheme(nextTheme);

    setTimeout(() => {
      setIsAnimating(false);
    }, ANIMATION_DURATION_MS);
  }, [resolvedTheme, setTheme]);

  const isLight = resolvedTheme === "light";

  return (
    <MotionConfig
      transition={{
        ease: [0.1, 0.9, 0.2, 1],
        duration: TRANSITION_DURATION,
      }}
    >
      <m.button
        aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
        className="relative flex h-8 min-w-8 items-center justify-center gap-1.5 overflow-hidden rounded-full bg-muted px-2 py-1.5 outline-none sm:h-9 sm:min-w-auto sm:px-3"
        onClick={handleToggle}
        type="button"
        variants={containerVariants}
        whileHover="hover"
        whileTap="tap"
      >
        <m.div
          className="relative flex size-6 shrink-0 items-center justify-center rounded-full sm:size-7"
          layout
        >
          <m.svg
            animate={{
              rotate: isLight ? 0 : 180,
              scale: isAnimating ? [1, 1.1, 1] : 1,
            }}
            aria-label={isLight ? "Light mode icon" : "Dark mode icon"}
            className="size-5 will-change-transform sm:size-6"
            fill="none"
            height="100"
            transition={{
              duration: TRANSITION_DURATION,
            }}
            viewBox="0 0 100 100"
            width="100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>{isLight ? "Light mode" : "Dark mode"}</title>
            <rect height="100" width="100" />
            <m.path
              animate={{
                fillOpacity: isAnimating ? [1, 0.7, 1] : 1,
              }}
              className="fill-primary will-change-transform"
              d="M50 18C58.4869 18 66.6262 21.3714 72.6274 27.3726C78.6286 33.3737 82 41.513 82 50C82 58.4869 78.6286 66.6262 72.6275 72.6274C66.6263 78.6286 58.487 82 50.0001 82L50 50L50 18Z"
              transition={{
                duration: 0.3,
                times: [0, 0.5, 1],
              }}
            />
            <m.circle
              animate={{
                strokeWidth: isAnimating ? [4, 5, 4] : 4,
              }}
              className="stroke-primary will-change-transform"
              cx="50"
              cy="50"
              r="30"
              strokeWidth="4"
              transition={{
                duration: TRANSITION_DURATION,
                times: [0, 0.5, 1],
              }}
            />
            <m.circle
              animate={{
                scale: isAnimating ? [1, 0.9, 1] : 1,
              }}
              className="fill-primary will-change-transform"
              cx="50"
              cy="50"
              r="12"
              transition={{
                duration: TRANSITION_DURATION,
                times: [0, 0.5, 1],
              }}
            />
            <m.path
              animate={{
                fillOpacity: isAnimating ? [1, 0.7, 1] : 1,
              }}
              className="fill-primary-foreground will-change-transform"
              d="M50 62C53.1826 62 56.2348 60.7357 58.4853 58.4853C60.7357 56.2348 62 53.1826 62 50C62 46.8174 60.7357 43.7652 58.4853 41.5147C56.2348 39.2643 53.1826 38 50 38L50 50L50 62Z"
              transition={{
                duration: TRANSITION_DURATION,
                times: [0, 0.5, 1],
              }}
            />
          </m.svg>
        </m.div>

        <div className="hidden items-center gap-1 font-medium text-xs sm:flex">
          <AnimatePresence mode="wait">
            {isLight ? (
              <m.span
                animate="visible"
                className="font-medium text-primary"
                exit="hidden"
                initial="initial"
                key="light"
                variants={modeVariants}
              >
                Light
              </m.span>
            ) : (
              <m.span
                animate="visible"
                className="font-medium text-primary"
                exit="hidden"
                initial="initial"
                key="dark"
                variants={modeVariants}
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
  );
}
