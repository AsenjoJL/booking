import { useEffect, useState } from 'react'

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

export function useCountUp(target: number, start: boolean, duration = 1400) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!start) {
      return
    }

    let animationFrame = 0
    const animationStart = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - animationStart) / duration, 1)
      setCount(Math.round(target * easeOutCubic(progress)))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(tick)
      }
    }

    animationFrame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(animationFrame)
  }, [duration, start, target])

  return count
}
