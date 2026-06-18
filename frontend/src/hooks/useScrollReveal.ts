import { useEffect, useRef, useState } from 'react'

type ScrollRevealOptions = {
  rootMargin?: string
  threshold?: number
}

export function useScrollReveal<T extends HTMLElement>({
  rootMargin = '0px 0px -12% 0px',
  threshold = 0.2,
}: ScrollRevealOptions = {}) {
  const ref = useRef<T | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || isVisible) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold },
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [isVisible, rootMargin, threshold])

  return { ref, isVisible }
}
