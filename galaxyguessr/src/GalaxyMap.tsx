import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { ArrowDownRight, ArrowLeft, Check, ChevronRight, Crosshair, Expand, MapPin, Minus, Plus, RotateCcw, Shrink, X } from 'lucide-react'
import { categories, locations } from './game'
import type { CategoryId } from './game'
import { atlasScenes, canGuess, homeCamera, initialScene, sceneForDestination, scenePath, zoomCamera } from './atlas'
import type { AtlasNode, MapCamera, SceneId } from './atlas'

const stars = Array.from({ length: 150 }, (_, i) => ({ x: (i * 137.51) % 1000, y: (i * 73.79) % 650, r: i % 9 === 0 ? 1.5 : .7 }))

const milkyWayStars = Array.from({ length: 400 }, (_, i) => ({ x: (i * 137.51) % 1600 - 300, y: (i * 73.79) % 1250 - 300, r: i % 9 === 0 ? 1.5 : .7 }))

function Chart({ scene, sceneId }: { scene: typeof atlasScenes[SceneId]; sceneId: SceneId }) {
  const galaxy = scene.kind === 'galaxy'
  // Keep the map coordinates unchanged while extending the artwork beyond its old crop.
  return <svg className="atlas-chart" viewBox={galaxy ? '-300 -300 1600 1250' : '0 0 1000 650'} style={galaxy ? { left: -300, top: -300, width: 1600, height: 1250 } : undefined} aria-hidden="true">
    <defs><radialGradient id="galaxy-cloud"><stop stopColor="#e9dfbe" stopOpacity=".27" /><stop offset=".25" stopColor="#9cbbd2" stopOpacity=".13" /><stop offset="1" stopColor="#8ba7bb" stopOpacity="0" /></radialGradient></defs>
    {(galaxy ? milkyWayStars : stars).map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={i % 3 ? '#adbfcd' : '#eef4ed'} opacity={i % 4 === 0 ? .7 : .28} />)}
    <path d="M0 325H1000M500 0V650" stroke="#aec8c9" strokeOpacity=".055" strokeDasharray="4 8" />
    {scene.kind === 'galaxy' && <g transform="translate(500 320) rotate(-24)"><ellipse rx="390" ry="240" fill="url(#galaxy-cloud)" />{[0, 90, 180, 270].map(deg => <g key={deg} transform={`rotate(${deg})`}><path d="M0 0C-110-150 120-245 265-95S360 160 190 190" fill="none" stroke="#a4c4d7" strokeOpacity=".08" strokeWidth="45" /><path d="M0 0C-110-150 120-245 265-95S360 160 190 190" fill="none" stroke="#afcbdc" strokeOpacity=".18" strokeWidth="2" /></g>)}<circle r="37" fill="url(#galaxy-cloud)" /></g>}
    {scene.kind === 'system' && <g transform={`translate(${sceneId === 'solar-system' ? 500 : 450} 320)`}>{(sceneId === 'solar-system' ? [78, 120, 165, 215, 275, 345, 425] : [120, 230, 330]).map(r => <ellipse key={r} rx={r} ry={r * .7} fill="none" stroke="#a3c9c6" strokeOpacity=".12" />)}{sceneId === 'solar-system' && <ellipse rx="236" ry="168" fill="none" stroke="#a8b4a2" strokeOpacity=".12" strokeWidth="20" strokeDasharray="1 6" />}</g>}
    {scene.kind === 'galaxies' && <g stroke="#8aa6bb" strokeOpacity=".1" strokeDasharray="3 8"><path d="M445 350L700 180L820 360L710 510L270 480L200 160L445 350" fill="none" /><circle cx="445" cy="350" r="210" fill="none" /><circle cx="445" cy="350" r="365" fill="none" /></g>}
  </svg>
}

export default function GalaxyMap({ category, guess, onGuess, ready, answer }: {
  category: CategoryId; guess: string; onGuess: (id: string) => void; ready: boolean; answer?: string;
}) {
  const [sceneId, setSceneId] = useState<SceneId>(() => initialScene(category))
  const [camera, setCamera] = useState<MapCamera>(homeCamera)
  const [size, setSize] = useState({ width: 650, height: 470 })
  const [expanded, setExpanded] = useState(false)
  const viewport = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ x: number; y: number; camera: MapCamera; distance: number } | null>(null)
  const scene = atlasScenes[sceneId]
  const fit = Math.min(size.width / 1000, size.height / 650)
  const scale = fit * camera.zoom
  const selected = locations.find(w => w.id === guess)

  const travel = useCallback((id: SceneId) => { setSceneId(id); setCamera(homeCamera); pointers.current.clear(); gesture.current = null }, [])
  useEffect(() => { if (answer) travel(sceneForDestination(answer)) }, [answer, travel])
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!expanded) return
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', close)
    return () => { document.body.style.overflow = old; window.removeEventListener('keydown', close) }
  }, [expanded])

  const zoom = useCallback((factor: number, anchor = { x: 0, y: 0 }) => {
    if (factor < 1 && camera.zoom * factor < .72 && scene.parent) { travel(scene.parent); return }
    // Zooming deeply over a system carries you into its next level of detail.
    if (factor > 1 && camera.zoom * factor > 2.9) {
      const child = scene.nodes.find(n => n.enter && Math.hypot((n.x - 500) * scale + camera.x - anchor.x, (n.y - 325) * scale + camera.y - anchor.y) < 160)
      if (child?.enter) { travel(child.enter); return }
    }
    setCamera(c => zoomCamera(c, factor, anchor))
  }, [camera, scale, scene, travel])
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const box = el.getBoundingClientRect()
      zoom(Math.exp(-Math.max(-120, Math.min(120, e.deltaY)) * .003), { x: e.clientX - box.left - box.width / 2, y: e.clientY - box.top - box.height / 2 })
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [zoom])
  function startPointer(e: ReactPointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button') || (e.pointerType === 'mouse' && e.button !== 0)) return
    e.currentTarget.focus({ preventScroll: true })
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const points = [...pointers.current.values()]
    gesture.current = { x: e.clientX, y: e.clientY, camera, distance: points.length === 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0 }
  }
  function movePointer(e: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const points = [...pointers.current.values()]
    if (points.length === 2 && gesture.current.distance) {
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
      const box = e.currentTarget.getBoundingClientRect()
      const anchor = { x: (points[0].x + points[1].x) / 2 - box.left - box.width / 2, y: (points[0].y + points[1].y) / 2 - box.top - box.height / 2 }
      setCamera(zoomCamera(gesture.current.camera, distance / gesture.current.distance, anchor))
    } else setCamera({ ...gesture.current.camera, x: gesture.current.camera.x + e.clientX - gesture.current.x, y: gesture.current.camera.y + e.clientY - gesture.current.y })
  }
  function endPointer(e: ReactPointerEvent<HTMLDivElement>) { pointers.current.delete(e.pointerId); gesture.current = null }
  function renderNode(node: AtlasNode) {
    const world = locations.find(w => w.id === node.id)
    const eligible = canGuess(node.id, category)
    const isGuess = guess === node.id
    const isAnswer = answer === node.id
    const label = world?.name ?? node.label
    return <div key={node.id} className={`atlas-node ${isGuess ? 'is-guess' : ''} ${isAnswer ? 'is-answer' : ''} ${!eligible && !node.enter ? 'context-node' : ''} ${node.enter ? 'portal-node' : ''}`} style={{ left: node.x, top: node.y, '--node-color': world?.color ?? '#a8eed1', transform: `translate(-50%, -50%) scale(${1 / scale})` } as CSSProperties}>
      <button className="atlas-destination" aria-label={eligible ? `Guess ${label}` : node.enter ? `Explore ${label}` : `${label}, outside this mission category`} aria-pressed={eligible ? isGuess : undefined} disabled={eligible ? !ready || !!answer : !node.enter} onClick={() => eligible ? onGuess(node.id) : node.enter && travel(node.enter)} onFocus={() => {
        const x = (node.x - 500) * scale + camera.x
        const y = (node.y - 325) * scale + camera.y
        if (Math.abs(x) > size.width / 2 - 50 || Math.abs(y) > size.height / 2 - 55) setCamera(c => ({ ...c, x: -(node.x - 500) * scale, y: -(node.y - 325) * scale }))
      }}>
        <span className={`atlas-body ${node.id === 'earth' ? 'earth-body' : ''} ${node.id === 'milky-way' ? 'galaxy-body' : ''}`}>
          {world ? <img src={world.preview} alt="" draggable={false} /> : node.id === 'milky-way' ? <span>✦</span> : node.id === 'solar-system' ? <span>☀</span> : <span />}
          {(isGuess || isAnswer) && <span className="atlas-pin">{isAnswer ? <Check size={13} /> : <MapPin size={13} />}</span>}
        </span><span className="atlas-node-label">{label}</span>
        {(isGuess || isAnswer) && <span className="atlas-pin-label">{isAnswer ? 'CORRECT LOCATION' : 'YOUR GUESS'}</span>}
      </button>
      {node.enter && eligible && <button className="atlas-enter" onClick={() => travel(node.enter!)} aria-label={`Explore ${label} moons`}>Moons <ChevronRight size={10} /></button>}
      {node.enter && !eligible && <span className="atlas-portal-hint">ZOOM IN <ArrowDownRight size={10} /></span>}
    </div>
  }
  const here = scene.nodes.some(n => n.id === guess)
  return <section className={`galaxy-map ${expanded ? 'atlas-expanded' : ''}`} data-scene={sceneId} aria-label="Galaxy guessing map">
    <div className="atlas-heading"><div><span className="eyebrow"><span className="live-dot" /> INTERACTIVE STAR ATLAS</span><h2>{answer ? 'Your discovery, mapped.' : 'Find your place.'}</h2></div><button className="atlas-icon" onClick={() => setExpanded(e => !e)} aria-label={expanded ? 'Collapse map' : 'Expand map'}>{expanded ? <Shrink size={17} /> : <Expand size={17} />}</button></div>
    <nav className="atlas-breadcrumbs" aria-label="Map location">{scenePath(sceneId).map((id, i) => <span key={id}>{i > 0 && <ChevronRight size={12} />}<button aria-current={id === sceneId ? 'location' : undefined} onClick={() => travel(id)}>{atlasScenes[id].name}</button></span>)}</nav>
    <div className="atlas-viewport" ref={viewport} tabIndex={0} role="region" aria-label={`${scene.name} map. Drag to pan. Scroll or use plus and minus to zoom. Use Tab to select destinations.`}
      onPointerDown={startPointer} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={endPointer} onLostPointerCapture={endPointer}
      onDoubleClick={e => { if (!(e.target as HTMLElement).closest('button')) zoom(1.5, { x: e.clientX - e.currentTarget.getBoundingClientRect().left - size.width / 2, y: e.clientY - e.currentTarget.getBoundingClientRect().top - size.height / 2 }) }}
      onKeyDown={e => {
        if (e.target !== e.currentTarget) return
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '0', 'Backspace'].includes(e.key)) e.preventDefault()
        if (e.key === '+' || e.key === '=') zoom(1.35)
        if (e.key === '-') zoom(1 / 1.35)
        if (e.key === '0') setCamera(homeCamera)
        if (e.key === 'Backspace' && scene.parent) travel(scene.parent)
        if (e.key.startsWith('Arrow')) setCamera(c => ({ ...c, x: c.x + (e.key === 'ArrowLeft' ? 55 : e.key === 'ArrowRight' ? -55 : 0), y: c.y + (e.key === 'ArrowUp' ? 55 : e.key === 'ArrowDown' ? -55 : 0) }))
      }}>
      <div className="atlas-space" style={{ transform: `translate(${size.width / 2 + camera.x - 500 * scale}px, ${size.height / 2 + camera.y - 325 * scale}px) scale(${scale})` }}><Chart scene={scene} sceneId={sceneId} />{scene.nodes.map(renderNode)}
        {answer && guess !== answer && here && scene.nodes.some(n => n.id === answer) && <svg className="atlas-route" viewBox="0 0 1000 650" aria-hidden="true"><line x1={scene.nodes.find(n => n.id === guess)!.x} y1={scene.nodes.find(n => n.id === guess)!.y} x2={scene.nodes.find(n => n.id === answer)!.x} y2={scene.nodes.find(n => n.id === answer)!.y} stroke="#a8eed1" strokeWidth={1.5 / scale} strokeDasharray={`${5 / scale} ${5 / scale}`} /></svg>}
      </div>
    </div>
    <div className="atlas-overlay"><div className="atlas-scene-title"><span>{scene.name.toUpperCase()}</span><small>{scene.subtitle}</small></div><div className="atlas-controls">{scene.parent && <button className="atlas-icon" onClick={() => travel(scene.parent!)} aria-label={`Zoom out to ${atlasScenes[scene.parent].name}`} title="Parent map"><ArrowLeft size={17} /></button>}<button className="atlas-icon" onClick={() => zoom(1.35)} aria-label="Zoom in"><Plus size={18} /></button><button className="atlas-icon" onClick={() => zoom(1 / 1.35)} aria-label="Zoom out"><Minus size={18} /></button><button className="atlas-icon" onClick={() => setCamera(homeCamera)} aria-label="Recenter map"><RotateCcw size={15} /></button></div></div>
    <div className="atlas-bottom"><span>DRAG TO EXPLORE · SCROLL / PINCH TO ZOOM</span><span>{Math.round(camera.zoom * 100)}%</span></div>
    {answer && <div className="atlas-reveal-locations"><button onClick={() => travel(sceneForDestination(guess))}><MapPin size={13} /><span>Your guess<b>{selected?.name}</b></span></button><ChevronRight size={14} /><button onClick={() => travel(sceneForDestination(answer))}><Check size={14} /><span>Correct location<b>{locations.find(w => w.id === answer)?.name}</b></span></button></div>}
    <div className="atlas-selection" aria-live="polite">{selected ? <><span className={`selection-pin ${answer ? 'locked' : ''}`}><MapPin size={18} /></span><div><small>{answer ? 'YOUR LOCKED GUESS' : 'PIN PLACED'}</small><b>{selected.name}</b></div>{!here && <button className="text-button" onClick={() => travel(sceneForDestination(guess))}>Find pin <Crosshair size={14} /></button>}{!answer && <button className="atlas-icon" onClick={() => onGuess('')} aria-label="Clear guess"><X size={16} /></button>}</> : <><Crosshair size={20} /><div><b>Plot your guess on the map</b><small>{category === 'all' ? 'Explore a galaxy, then a star or planetary system.' : `${categories.find(c => c.id === category)?.name} mission · tap a destination to place your pin.`}</small></div></>}</div>
    <p className="atlas-note">Schematic atlas · positions, orbits & sizes are illustrative. Stellar types mark examples.</p>
  </section>
}
