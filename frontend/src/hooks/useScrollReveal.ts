import { useEffect, useRef, useState } from 'react'

type ScrollRevealOptions = {
  rootMargin?: string
  threshold?: number
  once?: boolean
}

export function useScrollReveal<T extends HTMLElement>({
  rootMargin = '0px 0px -12% 0px',
  threshold = 0.2,
  once = false,
}: ScrollRevealOptions = {}) {
  const ref = useRef<T | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) {
          return
        }

        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) {
            observer.disconnect()
          }
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { rootMargin, threshold },
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [once, rootMargin, threshold])

  return { ref, isVisible }
}
