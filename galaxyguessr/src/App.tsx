import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, AudioLines, Check, CheckCircle2, ChevronRight, CircleHelp, Compass, Copy, Crosshair, Globe2, Headphones, Lightbulb, LoaderCircle, Maximize2, Orbit, Play, Radio, Rocket, RotateCcw, ShieldCheck, Sparkles, Square, Target, Timer, Trophy, Volume2, VolumeX, X } from 'lucide-react'
import { createMission, formatTime, locations, MAX_SCORE, readBest, saveBest, scoreRound } from './game'
import type { Location, RoundResult } from './game'
import { useNarration } from './useNarration'
const Panorama = lazy(() => import('./Panorama'))
type Page = 'home' | 'explore' | 'game' | 'results'
function Brand({ onClick }: { onClick: () => void }) {
  return <button className="brand" onClick={onClick} aria-label="GalaxyGuessr home"><span className="brand-symbol"><Orbit size={29} strokeWidth={1.7} /></span><span>Galaxy<span>Guessr</span></span></button>
}
function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const els = panel.current?.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]')
        if (!els?.length) return
        if (e.shiftKey && (document.activeElement === els[0] || document.activeElement === panel.current)) { e.preventDefault(); els[els.length - 1].focus() }
        else if (!e.shiftKey && document.activeElement === els[els.length - 1]) { e.preventDefault(); els[0].focus() }
      }
    }
    document.addEventListener('keydown', key)
    return () => { document.body.style.overflow = old; document.removeEventListener('keydown', key); previous?.focus() }
  }, [onClose])
  return <div className="modal-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div className={`modal ${wide ? 'modal-wide' : ''}`} ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}><div className="modal-title"><span className="eyebrow">{title}</span><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={21} /></button></div>{children}</div></div>
}
function WorldCard({ world, index, onClick }: { world: Location; index: number; onClick: () => void }) {
  return <button className="world-card" onClick={onClick} style={{ '--world-color': world.color } as React.CSSProperties}>
    <div className="world-image" style={{ backgroundImage: `url(${world.image})` }}><span className="world-number">0{index + 1}</span><span className="world-tag">{world.imageType === 'NASA panorama' ? <><span className="tiny-dot" /> NASA IMAGERY</> : <><Sparkles size={10} /> SIMULATED</>}</span><span className="world-open"><ArrowRight size={18} /></span></div>
    <div className="world-description"><div><h3>{world.name}</h3><p>{world.type}</p></div><ArrowRight size={19} /></div>
  </button>
}
function Ambient({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return
    let ctx: AudioContext | undefined
    try {
      ctx = new AudioContext()
      const gain = ctx.createGain(); gain.gain.value = .028; gain.connect(ctx.destination)
      ;[55, 82.4, 110.15].forEach(frequency => { const o = ctx!.createOscillator(); o.type = 'sine'; o.frequency.value = frequency; o.connect(gain); o.start() })
      void ctx.resume().catch(() => {})
    } catch { /* Sound is optional on unsupported browsers. */ }
    return () => { void ctx?.close().catch(() => {}) }
  }, [enabled])
  return null
}
export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [how, setHow] = useState(false)
  const [learn, setLearn] = useState<Location | null>(null)
  const [sound, setSound] = useState(false)
  const [mission, setMission] = useState<Location[]>([])
  const [round, setRound] = useState(0)
  const [hints, setHints] = useState(0)
  const [guess, setGuess] = useState('')
  const [results, setResults] = useState<RoundResult[]>([])
  const [reveal, setReveal] = useState<RoundResult | null>(null)
  const [ready, setReady] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [best, setBest] = useState(readBest)
  const [copied, setCopied] = useState(false)
  const [exitTo, setExitTo] = useState<Page | null>(null)
  const clock = useRef(0)
  const submitted = useRef(false)
  const { speak, stop, speaking, status } = useNarration()
  const total = results.reduce((sum, r) => sum + r.score, 0)
  const current = mission[round]
  const closeHow = useCallback(() => setHow(false), [])
  const closeLearn = useCallback(() => { setLearn(null); stop() }, [stop])
  const navigate = (next: Page) => {
    if (page === 'game' && next !== 'game') { setExitTo(next); return }
    stop(); setPage(next); window.scrollTo({ top: 0, behavior: 'instant' })
  }
  const start = () => {
    stop(); setMission(createMission()); setRound(0); setResults([]); setHints(0); setGuess(''); setReveal(null); setReady(false); setSeconds(0); submitted.current = false; setPage('game'); window.scrollTo(0, 0)
  }
  const onReady = useCallback(() => { setReady(true) }, [])
  useEffect(() => {
    if (page !== 'game' || !ready || reveal || exitTo) return
    clock.current = performance.now() - seconds * 1000
    const timer = window.setInterval(() => setSeconds(Math.floor((performance.now() - clock.current) / 1000)), 250)
    return () => window.clearInterval(timer)
    // The clock is intentionally created only when the play state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, ready, reveal, exitTo])
  const submit = () => {
    if (!guess || !ready || reveal || submitted.current) return
    submitted.current = true
    const elapsed = Math.max(seconds, Math.floor((performance.now() - clock.current) / 1000))
    const result = { locationId: current.id, guessId: guess, hints, seconds: elapsed, score: scoreRound(guess === current.id, hints, elapsed) }
    setSeconds(elapsed); setResults(prev => [...prev, result]); setReveal(result)
    stop(); void speak(`${current.id}-explanation`, current.explanation)
  }
  const nextRound = () => {
    stop()
    if (round === 4) { saveBest(total); setBest(readBest()); setPage('results'); window.scrollTo(0, 0); return }
    setRound(r => r + 1); setHints(0); setGuess(''); setReveal(null); setReady(false); setSeconds(0); submitted.current = false
  }
  const addHint = () => { if (hints >= 2 || !ready) return; stop(); setHints(hints + 1); void speak(`${current.id}-clue-${hints + 1}`, current.clues[hints + 1]) }
  const correctCount = results.filter(r => r.guessId === r.locationId).length
  return <div className="app"><Ambient enabled={sound} />
    <header className="header"><div className="header-inner"><Brand onClick={() => navigate('home')} /><nav aria-label="Main navigation"><button className={page === 'home' || page === 'game' || page === 'results' ? 'active' : ''} onClick={() => navigate('home')}>Play</button><button className={page === 'explore' ? 'active' : ''} onClick={() => navigate('explore')}>Explore</button><button onClick={() => setHow(true)}>How it works <CircleHelp size={13} /></button></nav><div className="header-actions"><span className="system-status"><i className="live-dot" /> ALL SYSTEMS GO</span><button className={`sound-button ${sound ? 'enabled' : ''}`} onClick={() => setSound(s => !s)} aria-label={sound ? 'Mute ambient sound' : 'Enable ambient sound'} title={sound ? 'Mute ambience' : 'Enable ambience'}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button></div></div></header>
    {page === 'home' && <main>
      <section className="hero page-width"><div className="hero-stars" aria-hidden="true" /><div className="hero-copy"><div className="eyebrow hero-eyebrow"><span className="line" /> A LITTLE CURIOSITY. A WHOLE UNIVERSE.</div><h1>Lost in space.<br /><span>Found by you.</span></h1><p>Touch down on a mysterious world. Look around.<br className="desktop-break" /> Follow the clues. Find your place in the universe.</p><div className="hero-buttons"><button className="button button-primary" onClick={start}><Rocket size={18} /> Launch expedition <ArrowRight size={19} /></button><button className="button button-secondary" onClick={() => setHow(true)}><Play size={13} fill="currentColor" /> How to play</button></div><div className="hero-facts"><span><b>05</b> rounds per mission</span><i /><span><b>06</b> uncharted worlds</span><i /><span><b>∞</b> curiosity required</span></div></div>
      <div className="hero-visual" aria-label="Mars photographed from space"><div className="orbit-path orbit-one" /><div className="orbit-path orbit-two" /><div className="planet-glow" /><img className="hero-planet" src="/mars-globe.jpg" alt="The rust-colored surface and polar cap of Mars" fetchPriority="high" /><div className="planet-label"><span className="label-cross">+</span><div><span className="eyebrow">DESTINATION</span><b>Unknown.</b><span className="mono">COORDINATES CLASSIFIED</span></div></div><div className="signal-label"><Radio size={14} /><span>SIGNAL ACQUIRED</span><i className="live-dot" /></div><span className="visual-coordinate">SOL SYSTEM / SECTOR 04</span><span className="orbit-node" /></div>
      <div className="hero-bottom"><span><span className="tiny-dot" /> NO DOWNLOADS. NO SIGN-UPS. JUST DISCOVERY.</span><button onClick={() => document.getElementById('destinations')?.scrollIntoView({ behavior: 'smooth' })}>SCROLL TO EXPLORE <ArrowDown size={14} /></button></div></section>
      <section className="destinations page-width" id="destinations"><div className="section-heading"><div><span className="eyebrow section-kicker">THE DESTINATION IS THE QUESTION</span><h2>Six worlds. Zero coordinates.</h2><p>From familiar neighbors to the edge of the unimaginable.</p></div><button className="text-button" onClick={() => navigate('explore')}>Explore all destinations <ArrowRight size={17} /></button></div><div className="world-grid home-worlds">{locations.slice(0, 4).map((w, i) => <WorldCard world={w} index={i} key={w.id} onClick={() => setLearn(w)} />)}</div></section>
      <section className="mission-strip page-width"><div className="mission-strip-icon"><Headphones size={24} /></div><div><span className="eyebrow">YOU’RE NOT ALONE OUT THERE</span><h3>A voice to guide your curiosity.</h3><p>Listen to clues, piece together the science, and discover something new with every landing.</p></div><button className="text-button" onClick={() => setHow(true)}>Meet your mission <ArrowRight size={17} /></button><div className="waveform" aria-hidden="true">{Array.from({ length: 25 }, (_, i) => <i key={i} style={{ height: `${8 + ((i * 17) % 36)}px` }} />)}</div></section>
      <div className="trust-line page-width"><span><Globe2 size={15} /> Real NASA imagery & clearly labeled simulations</span><span><ShieldCheck size={15} /> Built for curiosity. Grounded in science.</span><span><Maximize2 size={15} /> 360° exploration, on any screen</span></div>
    </main>}
    {page === 'explore' && <main className="explore-page page-width"><button className="back-link" onClick={() => navigate('home')}><ArrowLeft size={16} /> Mission control</button><div className="section-heading"><div><span className="eyebrow section-kicker">THE FIELD GUIDE</span><h1>Meet your next unknown.</h1><p>Six extraordinary places. A universe of things to discover.<br />Explore freely here, then put your knowledge to the test.</p></div><button className="button button-primary" onClick={start}><Rocket size={17} /> Start a mission <ArrowRight size={18} /></button></div><div className="world-grid explore-worlds">{locations.map((w, i) => <WorldCard key={w.id} world={w} index={i} onClick={() => setLearn(w)} />)}</div><p className="source-note"><ShieldCheck size={16} /> Mars and Moon panoramas use NASA photographs with reconstructed coverage. Other worlds are artistic simulations. Sources and image notes are available inside each destination.</p></main>}
    {page === 'game' && current && <main className="game-page page-width"><div className="game-heading"><div><span className="eyebrow section-kicker"><span className="live-dot" /> EXPEDITION IN PROGRESS</span><h1>Where in the universe are you?</h1></div><div className="scoreboard"><div><span className="eyebrow">ROUND</span><b>{String(round + 1).padStart(2, '0')} <small>/ 05</small></b></div><div><span className="eyebrow">MISSION SCORE</span><b>{total.toLocaleString()} <small>PTS</small></b></div><div><span className="eyebrow">TIME</span><b><Timer size={16} /> {formatTime(seconds)}</b></div></div></div><div className="round-progress" aria-label={`Round ${round + 1} of 5`}>{Array.from({ length: 5 }, (_, i) => <i className={i < round ? 'done' : i === round ? 'current' : ''} key={i} />)}</div>
      <div className="game-layout"><section className="explorer-panel"><Suspense fallback={<div className="panorama view-loading"><LoaderCircle className="spin" /> Opening visual link…</div>}><Panorama key={current.id} src={current.image} onReady={onReady} /></Suspense><div className="image-caption"><span><ShieldCheck size={12} /> {current.imageType === 'NASA panorama' ? 'NASA photographic mosaic · reconstructed coverage' : 'Artistic simulation · not a spacecraft photograph'}</span><span>LOOK CLOSELY. EVERY WORLD HAS A STORY.</span></div><div className="guide-panel"><div className="guide-heading"><div className="guide-avatar"><AudioLines size={22} /></div><div><span className="eyebrow">YOUR SPACE GUIDE</span><h3>A signal from the surface.</h3></div><button className={`icon-button ${speaking ? 'mint' : ''}`} disabled={!ready} onClick={() => speaking ? stop() : void speak(`${current.id}-${reveal ? 'explanation' : `clue-${hints}`}`, reveal ? current.explanation : current.clues[hints])} aria-label={speaking ? 'Stop narration' : 'Play narration'}>{speaking ? <Square size={17} /> : <Volume2 size={20} />}</button></div><p className="guide-text" aria-live="polite">{reveal ? current.explanation : current.clues[hints]}</p><div className="guide-footer"><span className="narration-status">{status || 'Audio on demand · full transcript above'}</span>{!reveal && <button className="hint-button" disabled={hints === 2 || !ready} onClick={addHint}><Lightbulb size={15} />{hints === 2 ? 'All clues unlocked' : 'Request a hint'}<span>{hints === 2 ? '2 / 2' : '−500 PTS'}</span></button>}</div></div></section>
      <aside className="guess-panel">{!reveal ? <><div className="panel-title"><span className="target-icon"><Target size={20} /></span><div><span className="eyebrow">MAKE THE CONNECTION</span><h2>Choose your location</h2></div></div><p className="panel-description">Trust your eyes. Follow the clues.<br />Where have you landed?</p><div className="guess-options" role="group" aria-label="Choose your guess">{locations.map(w => <button key={w.id} className={`guess-option ${guess === w.id ? 'selected' : ''}`} onClick={() => setGuess(w.id)} aria-pressed={guess === w.id} disabled={!ready}><span className={`mini-planet mini-${w.id}`} /><span><b>{w.name}</b><small>{w.type}</small></span><span className="radio-circle">{guess === w.id && <i />}</span></button>)}</div><div className="potential-score"><span>Points in reach</span><b>{scoreRound(true, hints, seconds).toLocaleString()} <small>/ 5,000</small></b></div><button className="button button-primary submit-guess" disabled={!guess || !ready} onClick={submit}><Crosshair size={17} />{!ready ? 'Connecting…' : 'Lock in guess'}<ArrowRight size={18} /></button><p className="guess-note">First clue is free. Extra hints cost 500 pts.<br />After 30s, 5 pts/sec · max time cost 1,000.</p></> : <div className="reveal-panel" aria-live="polite"><div className={`reveal-icon ${reveal.guessId === current.id ? 'correct' : ''}`}>{reveal.guessId === current.id ? <CheckCircle2 size={34} /> : <Compass size={34} />}</div><span className="eyebrow">{reveal.guessId === current.id ? 'COORDINATES CONFIRMED' : 'A NEW WORLD DISCOVERED'}</span><h2>{current.name}</h2><p>{reveal.guessId === current.id ? 'Your cosmic instincts were right.' : `You guessed ${locations.find(w => w.id === reveal.guessId)?.name}. Keep exploring.`}</p><div className="earned-score">+{reveal.score.toLocaleString()}<span>POINTS EARNED</span></div><div className="round-summary"><span>Hints used <b>{hints} / 2</b></span><span>Time to discover <b>{formatTime(seconds)}</b></span></div><div className="discovery-fact"><Sparkles size={17} /><p>{current.fact}</p></div><button className="button button-primary" onClick={nextRound}>{round === 4 ? 'View mission results' : 'Next destination'}<ArrowRight size={18} /></button><a className="source-link" href={current.source} target="_blank" rel="noreferrer">Explore the science at NASA ↗</a></div>}</aside></div>
    </main>}
    {page === 'results' && <main className="results-page page-width"><div className="results-top"><div className="results-emblem"><Orbit size={48} /><Sparkles size={17} /></div><span className="eyebrow section-kicker">MISSION COMPLETE</span><h1>{correctCount >= 4 ? 'You know your universe.' : 'Curiosity looks good on you.'}</h1><p>Five landings. New perspectives. One extraordinary universe.</p><div className="final-score">{total.toLocaleString()}<span>/ {MAX_SCORE.toLocaleString()} PTS</span></div><div className="results-stats"><span><Target size={18} /><b>{Math.round(correctCount / 5 * 100)}%</b> accuracy</span><span><Timer size={18} /><b>{formatTime(results.reduce((s, r) => s + r.seconds, 0))}</b> total time</span><span><Trophy size={18} /><b>{best.toLocaleString()}</b> personal best</span></div></div><div className="results-list"><div className="results-list-heading"><span className="eyebrow">YOUR DISCOVERY LOG</span><span className="eyebrow">5 WORLDS EXPLORED</span></div>{results.map((r, i) => { const w = locations.find(x => x.id === r.locationId)!; const correct = r.locationId === r.guessId; return <button className="result-row" key={w.id} onClick={() => setLearn(w)}><span className="mono row-index">0{i + 1}</span><img src={w.image} alt="" /><span className="result-world"><b>{w.name}</b><small>{w.type}</small></span><span className={`result-status ${correct ? 'mint' : ''}`}>{correct ? <Check size={15} /> : <Compass size={15} />}<span>{correct ? 'Identified' : 'Discovered'}</span></span><span className="result-time mono">{formatTime(r.seconds)}</span><b className="result-points">{r.score.toLocaleString()} <small>pts</small></b><ChevronRight size={16} /></button> })}</div><div className="results-actions"><button className="button button-primary" onClick={start}><RotateCcw size={17} /> Explore again <ArrowRight size={18} /></button><button className="button button-secondary" onClick={async () => { try { await navigator.clipboard.writeText(`I scored ${total.toLocaleString()}/25,000 in GalaxyGuessr with ${correctCount}/5 worlds identified! ${window.location.origin}`); setCopied(true) } catch { setCopied(false) } }}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Result copied' : 'Copy my result'}</button><button className="text-button" onClick={() => navigate('home')}>Return to mission control</button></div></main>}
    <footer className="footer page-width"><div><Orbit size={18} /><span>GalaxyGuessr</span><span className="footer-divider">/</span><span>A small step for your curiosity.</span></div><span>MADE FOR THE EXPLORER IN ALL OF US <span className="mint">✦</span></span></footer>
    {how && <Modal title="MISSION BRIEFING" onClose={closeHow}><span className="modal-icon"><Rocket size={29} /></span><h2>Your curiosity is<br />the only compass you need.</h2><p className="modal-intro">Five rounds. Five mystery destinations. Let’s see how well you know the universe.</p><div className="how-steps">{[{ icon: Globe2, title: 'Look around', text: 'Drag, swipe, or use arrow keys to explore a 360° panorama. Some are NASA mosaics; others are labeled artistic simulations.' }, { icon: Headphones, title: 'Listen for clues', text: 'Your first clue is free. Play it aloud or read the transcript. Two extra hints are available for 500 points each.' }, { icon: Crosshair, title: 'Make your discovery', text: 'Choose from six locations and lock in your guess. Correct answers start at 5,000 points. After 30 seconds, time costs 5 points per second, up to 1,000.' }].map((s, i) => <div key={s.title}><span className="step-number">0{i + 1}</span><s.icon size={20} /><div><h3>{s.title}</h3><p>{s.text}</p></div></div>)}</div><button className="button button-primary full-width" onClick={() => { setHow(false); start() }}>Ready for liftoff <Rocket size={18} /></button><p className="modal-footnote">No account required. Your personal best stays on this device.</p></Modal>}
    {learn && <Modal title="DESTINATION FIELD NOTES" onClose={closeLearn} wide><div className="field-heading"><div><span className="eyebrow section-kicker">{learn.type}</span><h2>{learn.name}</h2><p>{learn.tagline}</p></div><span className="field-badge">{learn.imageType}</span></div><Suspense fallback={<div className="field-loading">Loading explorer…</div>}><Panorama key={learn.id} src={learn.image} onReady={() => {}} /></Suspense><div className="field-stats"><div><span>AVERAGE DISTANCE</span><b>{learn.distance}</b></div><div><span>SURFACE TEMPERATURE³</span><b>{learn.temperature}</b></div><div><span>SURFACE GRAVITY</span><b>{learn.gravity}</b></div></div><div className="field-story"><p>{learn.explanation}</p><button className="icon-button" aria-label={speaking ? 'Stop destination narration' : 'Play destination narration'} onClick={() => speaking ? stop() : void speak(`${learn.id}-explanation`, learn.explanation)}>{speaking ? <Square size={18} /> : <Volume2 size={20} />}</button></div><div className="discovery-fact"><Sparkles size={17} /><p>{learn.fact}</p></div><p className="field-credit">{learn.credit}. {learn.note} Distances are approximate; AU is the Earth–Sun distance. ³Representative averages or ranges, varying by location and time.</p><a className="source-link" href={learn.source} target="_blank" rel="noreferrer">Read the science at NASA <ArrowRight size={14} /></a></Modal>}
    {exitTo && <Modal title="RETURN TO MISSION CONTROL?" onClose={() => setExitTo(null)}><h2>Your expedition is still in progress.</h2><p className="modal-intro">Leaving will end this mission. You can begin a new expedition whenever you’re ready.</p><div className="exit-actions"><button className="button button-primary" onClick={() => setExitTo(null)}>Continue expedition</button><button className="button button-secondary" onClick={() => { stop(); setPage(exitTo); setExitTo(null); window.scrollTo(0, 0) }}>End mission</button></div></Modal>}
  </div>
}
