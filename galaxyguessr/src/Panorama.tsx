import { Component, Suspense, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { BackSide, MathUtils, SRGBColorSpace, TextureLoader, PerspectiveCamera } from 'three'
import { Expand, Minus, Plus, RotateCcw, Move } from 'lucide-react'

type Props = { src: string; onReady: () => void }
function Scene({ src, onReady, onHeading }: Props & { onHeading: (n: number) => void }) {
  const texture = useLoader(TextureLoader, src)
  const { camera, gl, invalidate } = useThree()
  const view = useRef({ yaw: 0, pitch: 0, fov: 75 })
  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    onReady()
    const canvas = gl.domElement
    const host = canvas.closest('.panorama') as HTMLElement
    let pointer: { x: number; y: number } | null = null
    function update() {
      camera.rotation.order = 'YXZ'
      camera.rotation.set(MathUtils.degToRad(view.current.pitch), MathUtils.degToRad(view.current.yaw), 0)
      ;(camera as PerspectiveCamera).fov = view.current.fov
      ;(camera as PerspectiveCamera).updateProjectionMatrix()
      onHeading(((Math.round(-view.current.yaw) % 360) + 360) % 360)
      invalidate()
    }
    function down(e: PointerEvent) { pointer = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); host.focus({ preventScroll: true }) }
    function move(e: PointerEvent) {
      if (!pointer) return
      view.current.yaw += (e.clientX - pointer.x) * 0.16
      view.current.pitch = MathUtils.clamp(view.current.pitch + (e.clientY - pointer.y) * 0.16, -80, 80)
      pointer = { x: e.clientX, y: e.clientY }
      update()
    }
    function up() { pointer = null }
    function key(e: KeyboardEvent) {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '=', 'r', 'R'].includes(e.key) || e.target !== host) return
      e.preventDefault()
      if (e.key === 'ArrowLeft') view.current.yaw += 6
      if (e.key === 'ArrowRight') view.current.yaw -= 6
      if (e.key === 'ArrowUp') view.current.pitch += 5
      if (e.key === 'ArrowDown') view.current.pitch -= 5
      if (e.key === '+' || e.key === '=') view.current.fov -= 5
      if (e.key === '-') view.current.fov += 5
      if (e.key.toLowerCase() === 'r') view.current = { yaw: 0, pitch: 0, fov: 75 }
      view.current.pitch = MathUtils.clamp(view.current.pitch, -80, 80)
      view.current.fov = MathUtils.clamp(view.current.fov, 35, 95)
      update()
    }
    function control(e: Event) {
      const action = (e as CustomEvent<string>).detail
      if (action === 'reset') view.current = { yaw: 0, pitch: 0, fov: 75 }
      else view.current.fov = MathUtils.clamp(view.current.fov + (action === 'in' ? -10 : 10), 35, 95)
      update()
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    host.addEventListener('keydown', key)
    host.addEventListener('view-control', control)
    update()
    return () => {
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up)
      host.removeEventListener('keydown', key); host.removeEventListener('view-control', control)
    }
  }, [camera, gl, invalidate, onHeading, onReady, texture])
  return <mesh><sphereGeometry args={[500, 64, 32]} /><meshBasicMaterial map={texture} side={BackSide} toneMapped={false} /></mesh>
}
class ViewBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}
function Fallback({ src, onReady }: Props) {
  const [position, setPosition] = useState(50)
  const [zoom, setZoom] = useState(100)
  const fallback = useRef<HTMLDivElement>(null)
  const drag = useRef<number | null>(null)
  useEffect(onReady, [onReady])
  useEffect(() => {
    const host = fallback.current?.closest('.panorama') as HTMLElement | null
    const control = (e: Event) => {
      const action = (e as CustomEvent<string>).detail
      if (action === 'reset') { setPosition(50); setZoom(100) }
      else setZoom(z => MathUtils.clamp(z + (action === 'in' ? 15 : -15), 100, 200))
    }
    const key = (e: KeyboardEvent) => {
      if (e.target !== host) return
      if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); setPosition(p => (p + (e.key === 'ArrowLeft' ? -5 : 5) + 100) % 100) }
      if (['+', '=', '-', 'r', 'R'].includes(e.key)) { e.preventDefault(); control(new CustomEvent('view-control', { detail: e.key.toLowerCase() === 'r' ? 'reset' : e.key === '-' ? 'out' : 'in' })) }
    }
    host?.addEventListener('view-control', control); host?.addEventListener('keydown', key)
    return () => { host?.removeEventListener('view-control', control); host?.removeEventListener('keydown', key) }
  }, [])
  return <div ref={fallback} className="panorama-fallback" role="img" aria-label="Panoramic location, horizontal viewing mode" style={{ backgroundImage: `url(${src})`, backgroundPositionX: `${position}%`, backgroundSize: `auto ${zoom}%` }}
    onPointerDown={e => { drag.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); (e.currentTarget.closest('.panorama') as HTMLElement)?.focus({ preventScroll: true }) }}
    onPointerMove={e => { if (drag.current !== null) { setPosition(p => (p - (e.clientX - drag.current!) * .1 + 100) % 100); drag.current = e.clientX } }}
    onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
    <span className="fallback-label">Panorama mode · 3D unavailable</span>
  </div>
}
export default function Panorama({ src, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [heading, setHeading] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [fullscreenError, setFullscreenError] = useState('')
  const ready = useRef(onReady)
  ready.current = onReady
  const readyCallback = useRef(() => { setLoaded(true); ready.current() }).current
  const action = (detail: string) => host.current?.dispatchEvent(new CustomEvent('view-control', { detail }))
  return <div className="panorama" ref={host} tabIndex={0} aria-label="360 degree explorer. Drag or swipe to look around. Use arrow keys to rotate, plus and minus to zoom, R to reset.">
    <ViewBoundary key={src} fallback={<Fallback src={src} onReady={readyCallback} />}>
      <Canvas camera={{ position: [0, 0, 0.1], fov: 75, near: .1, far: 1000 }} frameloop="demand" dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: 'low-power' }} fallback={<Fallback src={src} onReady={readyCallback} />}>
        <Suspense fallback={null}><Scene src={src} onReady={readyCallback} onHeading={setHeading} /></Suspense>
      </Canvas>
    </ViewBoundary>
    {!loaded && <div className="view-loading"><span className="loader" /><span>Establishing visual link…</span></div>}
    <div className="crosshair" aria-hidden="true"><i /><i /></div>
    <div className="view-top"><span><i className="live-dot" /> VISUAL LINK LIVE</span><span>360° EXPLORER</span></div>
    <div className="view-bottom"><span className="drag-prompt"><Move size={15} /> Drag to explore <span>· arrow keys to look</span></span><div className="compass"><span>W</span><i /> <b>{heading.toString().padStart(3, '0')}°</b><i /><span>E</span></div><div className="view-controls">
      <button aria-label="Zoom in" title="Zoom in (+)" onClick={() => action('in')}><Plus size={17} /></button>
      <button aria-label="Zoom out" title="Zoom out (−)" onClick={() => action('out')}><Minus size={17} /></button>
      <button aria-label="Reset view" title="Reset view (R)" onClick={() => action('reset')}><RotateCcw size={16} /></button>
      <button aria-label="Fullscreen explorer" title="Fullscreen" onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await host.current?.requestFullscreen() } catch { setFullscreenError('Fullscreen is unavailable in this browser.') } }}><Expand size={16} /></button>
    </div></div>{fullscreenError && <div className="fullscreen-error" role="status">{fullscreenError}</div>}
  </div>
}
