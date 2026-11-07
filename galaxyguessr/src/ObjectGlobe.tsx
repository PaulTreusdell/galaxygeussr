import { Component, Suspense, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { TextureLoader, SRGBColorSpace } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Location } from './game'
import SoftwareGlobe from './SoftwareGlobe'

function Globe({ world }: { world: Location }) {
  const texture = useLoader(TextureLoader, world.texture)
  const { camera, gl, invalidate } = useThree()
  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    const controls = new OrbitControls(camera, gl.domElement)
    controls.enablePan = false; controls.enableZoom = false; controls.enableDamping = false
    controls.addEventListener('change', () => invalidate())
    const key = (event: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
      event.preventDefault()
      const angle = Math.atan2(camera.position.x, camera.position.z) + (event.key === 'ArrowLeft' ? -.18 : event.key === 'ArrowRight' ? .18 : 0)
      const height = Math.max(-2.6, Math.min(2.6, camera.position.y + (event.key === 'ArrowUp' ? .2 : event.key === 'ArrowDown' ? -.2 : 0)))
      const radius = Math.sqrt(3.3 ** 2 - height ** 2)
      camera.position.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius); controls.update(); invalidate()
    }
    const host = gl.domElement.closest('.object-orbit')
    const focus = () => (host as HTMLElement)?.focus({ preventScroll: true })
    host?.addEventListener('keydown', key as EventListener); gl.domElement.addEventListener('pointerdown', focus)
    invalidate()
    return () => { controls.dispose(); host?.removeEventListener('keydown', key as EventListener); gl.domElement.removeEventListener('pointerdown', focus) }
  }, [camera, gl, invalidate, texture])
  return <><ambientLight intensity={.65} /><directionalLight position={[-3, 3, 5]} intensity={2} /><mesh rotation={[0, .6, .08]}><sphereGeometry args={[1, 64, 32]} /><meshStandardMaterial map={texture} roughness={1} /></mesh>
    {world.id === 'saturn' && <mesh rotation={[-1.1, -.2, 0]}><ringGeometry args={[1.3, 1.95, 96]} /><meshBasicMaterial color="#b8a27c" side={2} transparent opacity={.75} /></mesh>}
  </>
}
class Boundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}
export default function ObjectGlobe({ world }: { world: Location }) {
  const spherical = ['planets', 'moons', 'minor-planets', 'stars'].includes(world.category)
  const host = useRef<HTMLDivElement>(null)
  const fallback = spherical ? <SoftwareGlobe world={world} /> : <img className="object-static" src={world.preview} alt={`${world.name}, schematic illustration`} />
  return <div className="object-orbit" tabIndex={spherical ? 0 : undefined} ref={host} aria-label={`${world.name} object view. ${spherical ? 'Drag to rotate, or use the arrow keys.' : 'Schematic illustration.'}`}>
    {spherical ? <Boundary fallback={fallback}><Canvas camera={{ position: [0, 0, 3.3], fov: 45 }} frameloop="demand" dpr={[1, 1.5]} fallback={fallback}>
      <Suspense fallback={null}><Globe world={world} /></Suspense></Canvas></Boundary> : fallback}
    <span className="object-orbit-note">{spherical ? 'Drag or use arrow keys to rotate · ' : ''}Schematic illustration · not to scale</span>
  </div>
}
