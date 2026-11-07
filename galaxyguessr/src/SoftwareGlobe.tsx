import { useCallback, useEffect, useRef, useState } from 'react'
import type { Location } from './game'

/** A small software-rendered sphere keeps rotation available without WebGL. */
export default function SoftwareGlobe({ world }: { world: Location }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const texture = useRef<ImageData | null>(null)
  const angle = useRef({ yaw: .5, pitch: 0 })
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const [loaded, setLoaded] = useState(false)
  const draw = useCallback(() => {
    const context = canvas.current?.getContext('2d')
    const map = texture.current
    if (!context || !map) return
    const n = 280, image = context.createImageData(n, n)
    const { yaw, pitch } = angle.current
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch)
    for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
      const x = (col / (n - 1) * 2 - 1) / .93, y = (row / (n - 1) * 2 - 1) / .93
      const radius = x*x + y*y
      if (radius > 1) continue
      const z = Math.sqrt(1 - radius)
      const py = y * cp - z * sp, pz = y * sp + z * cp
      const px = x * cy + pz * sy, rz = -x * sy + pz * cy
      const u = Math.floor(((Math.atan2(px, rz) / (2*Math.PI) + .5) % 1 + 1) % 1 * map.width)
      const v = Math.max(0, Math.min(map.height - 1, Math.floor((Math.asin(Math.max(-1, Math.min(1, py))) / Math.PI + .5) * map.height)))
      const source = (v * map.width + u) * 4, target = (row * n + col) * 4
      const light = world.category === 'stars' ? 1 : .18 + .82 * Math.max(0, -.4*x - .3*y + .85*z)
      for (let channel = 0; channel < 3; channel++) image.data[target + channel] = map.data[source + channel] * light
      image.data[target + 3] = Math.min(255, (1 - radius) * 9000)
    }
    context.putImageData(image, 0, 0)
  }, [world.category])
  useEffect(() => {
    const image = new Image()
    let active = true
    image.onload = () => {
      if (!active) return
      const offscreen = document.createElement('canvas'); offscreen.width = image.width; offscreen.height = image.height
      const context = offscreen.getContext('2d')
      if (!context) return
      context.drawImage(image, 0, 0); texture.current = context.getImageData(0, 0, image.width, image.height)
      draw(); setLoaded(true)
    }
    image.src = world.texture
    const host = canvas.current?.closest('.object-orbit')
    const key = (event: Event) => {
      const e = event as KeyboardEvent
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
      e.preventDefault()
      angle.current.yaw += e.key === 'ArrowLeft' ? -.18 : e.key === 'ArrowRight' ? .18 : 0
      angle.current.pitch += e.key === 'ArrowUp' ? -.18 : e.key === 'ArrowDown' ? .18 : 0
      draw()
    }
    host?.addEventListener('keydown', key)
    return () => { active = false; host?.removeEventListener('keydown', key) }
  }, [draw, world.texture])
  return <div className="software-globe">
    {!loaded && <img className="object-static" src={world.preview} alt={`${world.name}, schematic illustration`} />}
    <canvas ref={canvas} width={280} height={280} role="img" aria-label={`${world.name}, rotatable schematic globe`} style={{ opacity: loaded ? 1 : 0 }}
      onPointerDown={e => { pointer.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); (e.currentTarget.closest('.object-orbit') as HTMLElement)?.focus({ preventScroll: true }) }}
      onPointerMove={e => { if (!pointer.current) return
        angle.current.yaw -= (e.clientX - pointer.current.x) * .012; angle.current.pitch -= (e.clientY - pointer.current.y) * .012
        pointer.current = { x: e.clientX, y: e.clientY }; draw()
      }} onPointerUp={() => { pointer.current = null }} onPointerCancel={() => { pointer.current = null }} />
    {world.id === 'saturn' && <svg className="software-rings" viewBox="0 0 400 400" aria-hidden="true"><ellipse cx="200" cy="200" rx="183" ry="49" fill="none" stroke="#b8a27c" strokeWidth="16" transform="rotate(-20 200 200)" opacity=".8" /></svg>}
  </div>
}
