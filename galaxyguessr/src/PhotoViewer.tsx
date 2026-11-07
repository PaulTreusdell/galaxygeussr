import { useEffect, useRef, useState } from 'react'
import { Expand, Minus, Move, Plus, RotateCcw } from 'lucide-react'

export default function PhotoViewer({ src, onReady }: { src: string; onReady: () => void }) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [fullscreenError, setFullscreenError] = useState('')
  const [retry, setRetry] = useState(0)
  const host = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const ready = useRef(onReady); ready.current = onReady
  useEffect(() => { setLoaded(false); setError(false); setZoom(1); setOffset({ x: 0, y: 0 }) }, [src])
  function reset() { setZoom(1); setOffset({ x: 0, y: 0 }) }
  function pan(x: number, y: number) { setOffset(p => ({ x: Math.max(-500, Math.min(500, p.x + x)), y: Math.max(-400, Math.min(400, p.y + y)) })) }
  return <div className="panorama photo-viewer" ref={host} tabIndex={0} aria-label="Mystery image. Drag to pan. Use arrow keys to pan, plus and minus to zoom, R to reset."
    onKeyDown={e => { if (e.target !== host.current) return
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'r', 'R'].includes(e.key)) e.preventDefault()
      if (e.key === 'ArrowLeft') pan(25, 0); if (e.key === 'ArrowRight') pan(-25, 0)
      if (e.key === 'ArrowUp') pan(0, 25); if (e.key === 'ArrowDown') pan(0, -25)
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(4, z + .25)); if (e.key === '-') setZoom(z => Math.max(1, z - .25))
      if (e.key.toLowerCase() === 'r') reset()
    }}>
    <div className="photo-drag-surface" onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); host.current?.focus({ preventScroll: true }) }}
      onPointerMove={e => { if (drag.current) { pan(e.clientX - drag.current.x, e.clientY - drag.current.y); drag.current = { x: e.clientX, y: e.clientY } } }}
      onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
      <img key={`${src}-${retry}`} src={src} alt="Mystery celestial object to identify" draggable={false} style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }} onLoad={() => { setLoaded(true); ready.current() }} onError={() => setError(true)} />
    </div>
    {!loaded && <div className="view-loading" role="status">{error ? <><p>The image could not load.</p><button className="button button-secondary" onClick={() => { setError(false); setRetry(n => n + 1) }}>Retry image</button></> : 'Establishing visual link…'}</div>}
    <div className="view-top"><span><i className="live-dot" /> {loaded ? 'VISUAL LINK LIVE' : 'CONNECTING'}</span><span>DEEP SPACE OBSERVER</span></div>
    <div className="view-bottom"><span className="drag-prompt"><Move size={15} /> Drag to pan · zoom to inspect</span><div className="view-controls">
      <button aria-label="Zoom in" onClick={() => setZoom(z => Math.min(4, z + .5))}><Plus size={17} /></button><button aria-label="Zoom out" onClick={() => setZoom(z => Math.max(1, z - .5))}><Minus size={17} /></button><button aria-label="Reset view" onClick={reset}><RotateCcw size={16} /></button>
      <button aria-label="Fullscreen observer" onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await host.current?.requestFullscreen() } catch { setFullscreenError('Fullscreen is unavailable in this browser.') } }}><Expand size={16} /></button>
    </div></div>{fullscreenError && <div className="fullscreen-error" role="status">{fullscreenError}</div>}
  </div>
}
