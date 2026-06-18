import { Suspense, useMemo, useState } from 'react'
import { a, to, useSpring } from '@react-spring/three'
import { Canvas } from '@react-three/fiber'
import { Float, useTexture } from '@react-three/drei'
import image1Asset from '@/assets/image1.png'
import image2Asset from '@/assets/image2.png'
import image3Asset from '@/assets/image3.png'
import image4Asset from '@/assets/image4.png'

type PointerState = {
  x: number
  y: number
}

function FloatingPanel({
  imageUrl,
  position,
  rotation,
  scale,
  speed,
}: {
  imageUrl: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  speed: number
}) {
  const texture = useTexture(imageUrl)

  return (
    <Float speed={speed} rotationIntensity={0.28} floatIntensity={0.7}>
      <mesh position={position} rotation={rotation} scale={scale}>
        <planeGeometry args={[1, 1.28]} />
        <meshStandardMaterial map={texture} metalness={0.15} roughness={0.65} />
      </mesh>
    </Float>
  )
}

function HeroCluster({ pointer }: { pointer: PointerState }) {
  const spring = useSpring({
    rotateX: pointer.y * 0.18,
    rotateY: pointer.x * 0.24,
    rotateZ: pointer.x * -0.08,
    offsetX: pointer.x * 0.18,
    offsetY: pointer.y * 0.12,
    config: { mass: 2.4, tension: 220, friction: 28 },
  })

  const panels = useMemo(
    () => [
      {
        imageUrl: image2Asset,
        position: [0, 0.02, 0.15] as [number, number, number],
        rotation: [0.02, -0.02, 0.01] as [number, number, number],
        scale: [2.45, 3.08, 1] as [number, number, number],
        speed: 1.4,
      },
      {
        imageUrl: image4Asset,
        position: [-1.72, 0.64, -0.4] as [number, number, number],
        rotation: [0.06, 0.38, -0.08] as [number, number, number],
        scale: [1.12, 1.38, 1] as [number, number, number],
        speed: 1.8,
      },
      {
        imageUrl: image3Asset,
        position: [1.78, -0.58, -0.35] as [number, number, number],
        rotation: [-0.08, -0.42, 0.06] as [number, number, number],
        scale: [1.26, 1.54, 1] as [number, number, number],
        speed: 1.65,
      },
      {
        imageUrl: image1Asset,
        position: [1.5, 1.05, -0.78] as [number, number, number],
        rotation: [0.08, -0.28, 0.12] as [number, number, number],
        scale: [0.94, 1.18, 1] as [number, number, number],
        speed: 2,
      },
      {
        imageUrl: image4Asset,
        position: [-1.38, -0.92, -0.82] as [number, number, number],
        rotation: [-0.12, 0.18, 0.08] as [number, number, number],
        scale: [0.84, 1.04, 1] as [number, number, number],
        speed: 1.72,
      },
    ],
    [],
  )

  return (
    <a.group
      rotation={to([spring.rotateX, spring.rotateY, spring.rotateZ], (x, y, z) => [x, y, z])}
      position={to([spring.offsetX, spring.offsetY], (x, y) => [x, y, 0])}
    >
      <mesh position={[0, -0.1, -1.55]} rotation={[-0.02, 0.04, 0]} scale={[5.8, 3.8, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#f0ece4" roughness={1} />
      </mesh>

      {panels.map((panel) => (
        <FloatingPanel key={panel.imageUrl} {...panel} />
      ))}
    </a.group>
  )
}

export function HeroScene() {
  const [pointer, setPointer] = useState<PointerState>({ x: 0, y: 0 })

  return (
    <div
      className="relative h-[440px] overflow-hidden rounded-lg border bg-[radial-gradient(circle_at_top,_rgba(14,165,145,0.14),_transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,244,238,1))]"
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
        const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -2
        setPointer({ x, y })
      }}
      onPointerLeave={() => setPointer({ x: 0, y: 0 })}
    >
      <Canvas camera={{ position: [0, 0, 5.6], fov: 34 }}>
        <ambientLight intensity={1.35} />
        <directionalLight position={[2.8, 3.5, 4.5]} intensity={2.8} />
        <pointLight position={[-3, -1, 2]} intensity={0.75} color="#f97316" />
        <Suspense fallback={null}>
          <HeroCluster pointer={pointer} />
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute inset-x-5 bottom-5 flex items-center justify-between gap-4 rounded-md border bg-background/82 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Live catalog</p>
          <p className="text-sm font-semibold">Immersive storefront hero with your real assets</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Interaction</p>
          <p className="text-sm font-semibold">Move your cursor to steer the scene</p>
        </div>
      </div>
    </div>
  )
}
