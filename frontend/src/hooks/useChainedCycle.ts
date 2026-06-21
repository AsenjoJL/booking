import { useEffect, useState } from 'react'

type UseChainedCycleOptions = {
  intervalMs?: number
  swapDelayMs?: number
}

export function useChainedCycle(
  totalItems: number,
  { intervalMs = 4200, swapDelayMs = 260 }: UseChainedCycleOptions = {},
) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (totalItems <= 1) {
      return
    }

    let swapTimeoutId: number | undefined

    const intervalId = window.setInterval(() => {
      setIsVisible(false)

      swapTimeoutId = window.setTimeout(() => {
        setActiveIndex((current) => (current + 1) % totalItems)
        setIsVisible(true)
      }, swapDelayMs)
    }, intervalMs)

    return () => {
      window.clearInterval(intervalId)
      if (swapTimeoutId) {
        window.clearTimeout(swapTimeoutId)
      }
    }
  }, [intervalMs, swapDelayMs, totalItems])

  return { activeIndex, isVisible }
}
