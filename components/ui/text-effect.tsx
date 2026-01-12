/**
 * TextEffect Component
 *
 * Animated text component that supports various animation presets (blur, fade, scale, slide)
 * with configurable animation per character, word, or line. Provides fine-grained control
 * over animation timing, transitions, and styling.
 *
 * @module components/ui/text-effect
 */

"use client";

import type {
  TargetAndTransition,
  Transition,
  Variant,
  Variants,
} from "motion/react";
import { AnimatePresence, motion } from "motion/react";
import React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type PresetType = "blur" | "fade-in-blur" | "scale" | "fade" | "slide";

export type PerType = "word" | "char" | "line";

export interface TextEffectProps {
  children: string;
  per?: PerType;
  as?: keyof React.JSX.IntrinsicElements;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
  className?: string;
  preset?: PresetType;
  delay?: number;
  speedReveal?: number;
  speedSegment?: number;
  trigger?: boolean;
  onAnimationComplete?: () => void;
  onAnimationStart?: () => void;
  segmentWrapperClassName?: string;
  containerTransition?: Transition;
  segmentTransition?: Transition;
  style?: React.CSSProperties;
}

interface AnimationComponentProps {
  segment: string;
  variants: Variants;
  per: PerType;
  segmentWrapperClassName?: string;
}

interface PresetVariants {
  container: Variants;
  item: Variants;
}

// ============================================================================
// Constants
// ============================================================================

const STAGGER_TIME_CHAR_MS = 0.03;
const STAGGER_TIME_WORD_MS = 0.05;
const STAGGER_TIME_LINE_MS = 0.1;
const DEFAULT_STAGGER_CHILDREN_MS = 0.05;
const BASE_ANIMATION_DURATION_MS = 0.3;
const BLUR_FILTER_PX = 12;
const SLIDE_OFFSET_PX = 20;
const STAGGER_DIRECTION_REVERSE = -1;

const CSS_CLASS_BLOCK = "block";
const CSS_CLASS_INLINE_BLOCK = "inline-block";
const CSS_CLASS_WHITESPACE_PRE = "whitespace-pre";
const CSS_CLASS_SR_ONLY = "sr-only";

const DEFAULT_PER_TYPE: PerType = "word";
const DEFAULT_AS_TAG: keyof React.JSX.IntrinsicElements = "p";
const DEFAULT_PRESET: PresetType = "fade";
const DEFAULT_DELAY_MS = 0;
const DEFAULT_SPEED_REVEAL = 1;
const DEFAULT_SPEED_SEGMENT = 1;
const DEFAULT_TRIGGER = true;

const WORD_SPLIT_REGEX = /(\s+)/;

const defaultStaggerTimes: Readonly<Record<PerType, number>> = {
  char: STAGGER_TIME_CHAR_MS,
  word: STAGGER_TIME_WORD_MS,
  line: STAGGER_TIME_LINE_MS,
} as const;

const defaultContainerVariants: Readonly<Variants> = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: DEFAULT_STAGGER_CHILDREN_MS,
    },
  },
  exit: {
    transition: {
      staggerChildren: DEFAULT_STAGGER_CHILDREN_MS,
      staggerDirection: STAGGER_DIRECTION_REVERSE,
    },
  },
} as const;

const defaultItemVariants: Readonly<Variants> = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
  },
  exit: { opacity: 0 },
} as const;

const presetVariants: Readonly<Record<PresetType, PresetVariants>> = {
  blur: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: `blur(${BLUR_FILTER_PX}px)` },
      visible: { opacity: 1, filter: "blur(0px)" },
      exit: { opacity: 0, filter: `blur(${BLUR_FILTER_PX}px)` },
    },
  },
  "fade-in-blur": {
    container: defaultContainerVariants,
    item: {
      hidden: {
        opacity: 0,
        y: SLIDE_OFFSET_PX,
        filter: `blur(${BLUR_FILTER_PX}px)`,
      },
      visible: { opacity: 1, y: 0, filter: "blur(0px)" },
      exit: {
        opacity: 0,
        y: SLIDE_OFFSET_PX,
        filter: `blur(${BLUR_FILTER_PX}px)`,
      },
    },
  },
  scale: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0 },
      visible: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0 },
    },
  },
  fade: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 },
    },
  },
  slide: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: SLIDE_OFFSET_PX },
      visible: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: SLIDE_OFFSET_PX },
    },
  },
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Splits text into segments based on the specified granularity (line, word, or char).
 * For word splitting, preserves whitespace by capturing it in the regex.
 */
const splitText = (text: string, per: PerType): readonly string[] => {
  if (per === "line") {
    return text.split("\n");
  }
  if (per === "word") {
    return text.split(WORD_SPLIT_REGEX);
  }
  return text.split("");
};

/**
 * Type guard to check if a variant has a transition property.
 */
const hasTransition = (
  variant?: Variant
): variant is TargetAndTransition & { transition?: Transition } => {
  if (!variant) {
    return false;
  }
  return typeof variant === "object" && "transition" in variant;
};

/**
 * Merges base variants with custom transition settings.
 * Preserves existing transition properties while applying new ones.
 */
const createVariantsWithTransition = (
  baseVariants: Variants,
  transition?: Transition & { exit?: Transition }
): Variants => {
  if (!transition) {
    return baseVariants;
  }

  const { exit: _exitTransition, ...mainTransition } = transition;

  const visibleTransition = hasTransition(baseVariants.visible)
    ? baseVariants.visible.transition
    : {};

  const exitTransition = hasTransition(baseVariants.exit)
    ? baseVariants.exit.transition
    : {};

  return {
    ...baseVariants,
    visible: {
      ...baseVariants.visible,
      transition: {
        ...visibleTransition,
        ...mainTransition,
      },
    },
    exit: {
      ...baseVariants.exit,
      transition: {
        ...exitTransition,
        ...mainTransition,
        staggerDirection: STAGGER_DIRECTION_REVERSE,
      },
    },
  };
};

/**
 * Renders a line segment with animation variants.
 */
const renderLineSegment = (
  segment: string,
  variants: Variants
): React.ReactElement => {
  return (
    <motion.span className={CSS_CLASS_BLOCK} variants={variants}>
      {segment}
    </motion.span>
  );
};

/**
 * Renders a word segment with animation variants.
 */
const renderWordSegment = (
  segment: string,
  variants: Variants
): React.ReactElement => {
  return (
    <motion.span
      aria-hidden="true"
      className={cn(CSS_CLASS_INLINE_BLOCK, CSS_CLASS_WHITESPACE_PRE)}
      variants={variants}
    >
      {segment}
    </motion.span>
  );
};

/**
 * Renders a character segment with animation variants.
 * Each character is wrapped in its own motion span for individual animation.
 */
const renderCharSegment = (
  segment: string,
  variants: Variants,
  segmentIndex: number
): React.ReactElement => {
  const chars = segment.split("");
  return (
    <motion.span
      className={cn(CSS_CLASS_INLINE_BLOCK, CSS_CLASS_WHITESPACE_PRE)}
    >
      {chars.map((char, charIndex) => {
        return (
          <motion.span
            aria-hidden="true"
            className={cn(CSS_CLASS_INLINE_BLOCK, CSS_CLASS_WHITESPACE_PRE)}
            key={`char-${segmentIndex}-${charIndex}-${char}`}
            variants={variants}
          >
            {char}
          </motion.span>
        );
      })}
    </motion.span>
  );
};

/**
 * Renders the appropriate segment type based on the `per` prop.
 */
const renderSegmentContent = (
  segment: string,
  variants: Variants,
  per: PerType,
  segmentIndex: number
): React.ReactElement => {
  if (per === "line") {
    return renderLineSegment(segment, variants);
  }
  if (per === "word") {
    return renderWordSegment(segment, variants);
  }
  return renderCharSegment(segment, variants, segmentIndex);
};

// ============================================================================
// Components
// ============================================================================

interface AnimationComponentPropsWithIndex extends AnimationComponentProps {
  segmentIndex: number;
}

const AnimationComponent: React.FC<AnimationComponentPropsWithIndex> =
  React.memo(
    ({ segment, variants, per, segmentWrapperClassName, segmentIndex }) => {
      const content = renderSegmentContent(
        segment,
        variants,
        per,
        segmentIndex
      );

      if (!segmentWrapperClassName) {
        return content;
      }

      const defaultWrapperClassName =
        per === "line" ? CSS_CLASS_BLOCK : CSS_CLASS_INLINE_BLOCK;

      return (
        <span className={cn(defaultWrapperClassName, segmentWrapperClassName)}>
          {content}
        </span>
      );
    }
  );

AnimationComponent.displayName = "AnimationComponent";

// ============================================================================
// Main Component
// ============================================================================

/**
 * TextEffect - Animated text component with configurable presets and timing.
 *
 * Supports animation per character, word, or line with various presets.
 * Provides callbacks for animation lifecycle events and full control over
 * transition timing and styling.
 */
export function TextEffect({
  children,
  per = DEFAULT_PER_TYPE,
  as = DEFAULT_AS_TAG,
  variants,
  className,
  preset = DEFAULT_PRESET,
  delay = DEFAULT_DELAY_MS,
  speedReveal = DEFAULT_SPEED_REVEAL,
  speedSegment = DEFAULT_SPEED_SEGMENT,
  trigger = DEFAULT_TRIGGER,
  onAnimationComplete,
  onAnimationStart,
  segmentWrapperClassName,
  containerTransition,
  segmentTransition,
  style,
}: TextEffectProps): React.ReactElement {
  const segments = splitText(children, per);
  const MotionTag = React.useMemo(
    () => motion.create(as as string),
    [as]
  ) as typeof motion.div;

  const baseVariants = preset
    ? presetVariants[preset]
    : { container: defaultContainerVariants, item: defaultItemVariants };

  const stagger = defaultStaggerTimes[per] / speedReveal;
  const baseDuration = BASE_ANIMATION_DURATION_MS / speedSegment;

  const containerVisibleVariant = variants?.container?.visible;
  const hasContainerTransition = hasTransition(containerVisibleVariant ?? {});

  const customStagger = hasContainerTransition
    ? (containerVisibleVariant as TargetAndTransition).transition
        ?.staggerChildren
    : undefined;

  const customDelay = hasContainerTransition
    ? (containerVisibleVariant as TargetAndTransition).transition?.delayChildren
    : undefined;

  const computedVariants = {
    container: createVariantsWithTransition(
      variants?.container ?? baseVariants.container,
      {
        staggerChildren: customStagger ?? stagger,
        delayChildren: customDelay ?? delay,
        ...containerTransition,
        exit: {
          staggerChildren: customStagger ?? stagger,
          staggerDirection: STAGGER_DIRECTION_REVERSE,
        },
      }
    ),
    item: createVariantsWithTransition(variants?.item ?? baseVariants.item, {
      duration: baseDuration,
      ...segmentTransition,
    }),
  };

  const shouldShowScreenReaderText = per !== "line";

  return (
    <AnimatePresence mode="popLayout">
      {trigger && (
        <MotionTag
          animate="visible"
          className={className}
          exit="exit"
          initial="hidden"
          onAnimationComplete={onAnimationComplete}
          onAnimationStart={onAnimationStart}
          style={style}
          variants={computedVariants.container}
        >
          {shouldShowScreenReaderText && (
            <span className={CSS_CLASS_SR_ONLY}>{children}</span>
          )}
          {segments.map((segment, index) => {
            return (
              <AnimationComponent
                key={`${per}-${index}-${segment}`}
                per={per}
                segment={segment}
                segmentIndex={index}
                segmentWrapperClassName={segmentWrapperClassName}
                variants={computedVariants.item}
              />
            );
          })}
        </MotionTag>
      )}
    </AnimatePresence>
  );
}
