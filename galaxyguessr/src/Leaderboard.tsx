import { useAuth } from './Auth'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, LoaderCircle, Trophy } from 'lucide-react'
import { api } from './api-client'
import { categories, formatTime } from './game'
import type { CategoryId, RoundResult } from './game'

export type BoardId = CategoryId | 'overall'
type Entry = { name: string; score: number; seconds: number; correct: number; categories: number }
export function CategoryTabs({ value, onChange, overall = false }: { value: string; onChange: (value: BoardId) => void; overall?: boolean }) {
  const tabs = [...(overall ? [{ id: 'overall', name: 'Overall' }] : []), ...categories]
  return <div className="category-tabs" role="group" aria-label={overall ? 'Leaderboard category' : 'Field guide category'}>{tabs.map(c =>
    <button className={value === c.id ? 'selected' : ''} key={c.id} aria-pressed={value === c.id} onClick={() => onChange(c.id as BoardId)}>{c.name}</button>)}</div>
}
export default function Leaderboard({ category, onCategory, onBack }: { category: BoardId; onCategory: (category: BoardId) => void; onBack: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setRetry(n => n + 1) }
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 15000)
    return () => { window.removeEventListener('focus', refresh); window.clearInterval(timer) }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setEntries([])
    api<{ entries: Entry[] }>(`/api/leaderboard?category=${category}`, undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) setEntries(data.entries) }).catch(e => { if (!controller.signal.aborted) setError(e.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [category, retry])
  const title = category === 'overall' ? 'The whole universe.' : `${categories.find(c => c.id === category)?.name} leaderboard.`
  return <main className="leaderboard-page page-width"><button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Choose an expedition</button>
    <span className="eyebrow section-kicker">THE EXPLORERS’ LEAGUE</span><h1>{title}</h1>
    <p className="page-intro">A little friendly competition. A lot of curiosity.</p><button className="text-button" disabled={loading} onClick={() => setRetry(n => n + 1)}>Refresh scores</button><CategoryTabs value={category} onChange={onCategory} overall />
    <div className="board-explanation"><Trophy size={21} /><p>{category === 'overall'
      ? 'Your best score from each of the seven specialist categories adds up here. Up to 175,000 points. All space missions have their own board.'
      : 'Your highest five-round mission score counts. Up to 25,000 points. Faster missions break score ties.'}</p></div>
    <div className="leaderboard-status" role="status">{loading ? <><LoaderCircle className="spin" size={19} /> Retrieving explorer scores…</> : error ? <><p>{error}</p><button className="button button-secondary" onClick={() => setRetry(n => n + 1)}>Try again</button></> : null}</div>
    {!loading && !error && (entries.length ? <div className="board-scroll"><table className="leaderboard-table"><caption className="sr-only">Top 50 explorers for {category}</caption><thead><tr><th scope="col">Rank</th><th scope="col">Explorer</th><th scope="col">{category === 'overall' ? 'Categories' : 'Identified'}</th><th scope="col">Time</th><th scope="col">Score</th></tr></thead><tbody>{entries.map((entry, index) => <tr key={index}><td><span className={index < 3 ? 'rank top-rank' : 'rank'}>{String(index + 1).padStart(2, '0')}</span></td><td className={entry.name === 'Anonymous' ? 'anonymous-name' : ''}>{entry.name}</td><td>{category === 'overall' ? `${entry.categories} / 7` : `${entry.correct} / 5`}</td><td className="mono">{formatTime(entry.seconds)}</td><td className="board-score">{entry.score.toLocaleString()} <small>PTS</small></td></tr>)}</tbody></table></div>
      : <div className="board-empty"><Trophy size={35} /><h2>This corner of space is unclaimed.</h2><p>{category === 'overall' ? 'Complete a specialist expedition to join this board. Mixed missions appear on the All space board.' : 'Complete an expedition while signed in to post the first score.'}</p><button className="button button-primary" onClick={onBack}>Choose an expedition</button></div>)}
    <p className="board-footnote">Best scores per explorer · Top 50 · Scores shared across devices · Account required to post</p>
  </main>
}
export function ScoreSubmission({ missionId, rounds, category, onLeaderboard }: {
  missionId: string | null; rounds: RoundResult[]; category: CategoryId; onLeaderboard: (category: BoardId) => void;
}) {
  const { user, loading, open } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [prompted, setPrompted] = useState(false)
  useEffect(() => {
    if (!loading && !user && !prompted) { setPrompted(true); open('register') }
  }, [loading, user, prompted, open])
  const attempted = useRef(false)
  const inFlight = useRef(false)
  const submit = useCallback(async () => {
    if (inFlight.current || !missionId || !user) return
    inFlight.current = true
    setSaving(true); setError('')
    try { await api('/api/scores', { missionId, rounds }); setSaved(true) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to post score.') }
    finally { inFlight.current = false; setSaving(false) }
  }, [missionId, rounds, user])
  useEffect(() => {
    if (!loading && user && missionId && !attempted.current) {
      attempted.current = true
      void submit()
    }
  }, [loading, user, missionId, submit])
  return <section className="score-submission"><span className="eyebrow section-kicker">A PLACE AMONG THE EXPLORERS</span><h2>Leave your mark.</h2>
    <p>Your completed score saves to the {categories.find(c => c.id === category)?.name} leaderboard when signed in.</p>
    {saved ? <div className="submission-success" role="status"><CheckCircle2 size={22} />Score posted.<button className="text-button" onClick={() => onLeaderboard(category)}>View leaderboard</button></div>
    : loading ? <p role="status">Checking your account...</p> : !user ? <div className="submission-actions"><button className="button button-primary" onClick={() => open('register')}>Create account to post</button><button className="text-button" onClick={() => open('login')}>Already have an account? Sign in</button></div>
    : <form onSubmit={e => { e.preventDefault(); void submit() }}><p className="privacy-note">Posting as <strong>{user.username}</strong>. Your username and score will appear publicly.</p>
      {!missionId && <p className="form-error">This mission was played offline. Play a connected mission to post a score.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="submission-actions"><button className="button button-primary" disabled={saving || !missionId}>{saving ? 'Saving score...' : 'Retry saving score'}</button></div>
    </form>}
  </section>
}
