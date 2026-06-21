import type { Variants } from 'framer-motion'

export const easeOutCurve = [0.22, 1, 0.36, 1] as const
export const easeInOutCurve = [0.42, 0, 0.58, 1] as const

export const replayViewport = { once: false, margin: '-80px' } as const
export const replayViewportWide = { once: false, margin: '-100px' } as const
export const replayViewportTight = { once: false, margin: '-90px' } as const

export function createStaggerContainer(
  staggerChildren = 0.12,
  delayChildren = 0.08,
): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren,
        delayChildren,
      },
    },
  }
}

export function createFadeUpVariants(y = 28, duration = 0.65): Variants {
  return {
    hidden: { opacity: 0, y },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration, ease: easeOutCurve },
    },
  }
}

export function createSlideVariants(x = 48, duration = 0.8): { left: Variants; right: Variants } {
  return {
    left: {
      hidden: { opacity: 0, x: -x },
      visible: {
        opacity: 1,
        x: 0,
        transition: { duration, ease: easeOutCurve },
      },
    },
    right: {
      hidden: { opacity: 0, x },
      visible: {
        opacity: 1,
        x: 0,
        transition: { duration, ease: easeOutCurve },
      },
    },
  }
}

export function createScaleVariants(scale = 0.95, duration = 0.6): Variants {
  return {
    hidden: { opacity: 0, scale },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration, ease: easeOutCurve },
    },
  }
}
