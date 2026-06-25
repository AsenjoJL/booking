import { lazy, Suspense, useEffect, useState } from 'react'
import image2Asset from '@/assets/image2.png'
import image3Asset from '@/assets/image3.png'

const HeroScene = lazy(async () => {
  const module = await import('@/components/home/HeroScene')
  return { default: module.HeroScene }
})

function HeroSceneStaticFallback() {
  return (
    <div className="relative h-[440px] overflow-hidden rounded-lg border bg-muted">
      <img
        src={image2Asset}
        alt="Storefront hero"
        className="absolute inset-0 h-full w-full object-contain object-bottom px-6 pt-6"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/62 via-black/28 to-transparent" />
      <div className="absolute inset-x-5 top-5 max-w-sm rounded-md border bg-background/82 px-4 py-3 backdrop-blur">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Storefront hero</p>
        <p className="mt-1 text-sm font-semibold">Real product imagery with a lighter fallback path</p>
      </div>
      <div className="absolute inset-x-5 bottom-5 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border bg-background/82 px-4 py-3 backdrop-blur">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fast path</p>
          <p className="mt-1 text-sm font-semibold">Static media keeps first paint lighter on smaller or reduced-motion devices.</p>
        </div>
        <div className="overflow-hidden rounded-md border bg-background/82 backdrop-blur">
          <img src={image3Asset} alt="Collection preview" className="h-full w-full object-contain px-2 pt-2" />
        </div>
      </div>
    </div>
  )
}

export function LazyHeroScene() {
  const [shouldLoad, setShouldLoad] = useState(false)
  const [canUseImmersiveHero, setCanUseImmersiveHero] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true
    }

    return window
      .matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)')
      .matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)')
    const updateEligibility = () => setCanUseImmersiveHero(mediaQuery.matches)
    mediaQuery.addEventListener('change', updateEligibility)

    return () => {
      mediaQuery.removeEventListener('change', updateEligibility)
    }
  }, [])

  useEffect(() => {
    if (!canUseImmersiveHero) {
      return
    }

    let cancelled = false

    const loadScene = () => {
      if (!cancelled) {
        setShouldLoad(true)
      }
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(loadScene, { timeout: 1200 })
      return () => {
        cancelled = true
        window.cancelIdleCallback(idleId)
      }
    }

    const timeoutId = globalThis.setTimeout(loadScene, 250)
    return () => {
      cancelled = true
      globalThis.clearTimeout(timeoutId)
    }
  }, [canUseImmersiveHero])

  if (!canUseImmersiveHero) {
    return <HeroSceneStaticFallback />
  }

  if (!shouldLoad) {
    return <HeroSceneStaticFallback />
  }

  return (
    <Suspense fallback={<HeroSceneStaticFallback />}>
      <HeroScene />
    </Suspense>
  )
}
