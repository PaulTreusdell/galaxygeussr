import { useEffect, useState } from 'react'
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
    const controller = new AbortController()
    setLoading(true); setError(''); setEntries([])
    api<{ entries: Entry[] }>(`/api/leaderboard?category=${category}`, undefined, controller.signal)
      .then(data => { setEntries(data.entries) }).catch(e => { if (!controller.signal.aborted) setError(e.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [category, retry])
  const title = category === 'overall' ? 'The whole universe.' : `${categories.find(c => c.id === category)?.name} leaderboard.`
  return <main className="leaderboard-page page-width"><button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Choose an expedition</button>
    <span className="eyebrow section-kicker">THE EXPLORERS’ LEAGUE</span><h1>{title}</h1>
    <p className="page-intro">A little friendly competition. A lot of curiosity.</p><CategoryTabs value={category} onChange={onCategory} overall />
    <div className="board-explanation"><Trophy size={21} /><p>{category === 'overall'
      ? 'Your best score from each of the seven specialist categories adds up here. Up to 175,000 points. All space missions have their own board.'
      : 'Your highest five-round mission score counts. Up to 25,000 points. Faster missions break score ties.'}</p></div>
    <div className="leaderboard-status" role="status">{loading ? <><LoaderCircle className="spin" size={19} /> Retrieving explorer scores…</> : error ? <><p>{error}</p><button className="button button-secondary" onClick={() => setRetry(n => n + 1)}>Try again</button></> : null}</div>
    {!loading && !error && (entries.length ? <div className="board-scroll"><table className="leaderboard-table"><caption className="sr-only">Top 50 explorers for {category}</caption><thead><tr><th scope="col">Rank</th><th scope="col">Explorer</th><th scope="col">{category === 'overall' ? 'Categories' : 'Identified'}</th><th scope="col">Time</th><th scope="col">Score</th></tr></thead><tbody>{entries.map((entry, index) => <tr key={index}><td><span className={index < 3 ? 'rank top-rank' : 'rank'}>{String(index + 1).padStart(2, '0')}</span></td><td className={entry.name === 'Anonymous' ? 'anonymous-name' : ''}>{entry.name}</td><td>{category === 'overall' ? `${entry.categories} / 7` : `${entry.correct} / 5`}</td><td className="mono">{formatTime(entry.seconds)}</td><td className="board-score">{entry.score.toLocaleString()} <small>PTS</small></td></tr>)}</tbody></table></div>
      : <div className="board-empty"><Trophy size={35} /><h2>This corner of space is unclaimed.</h2><p>Complete an expedition and post the first score.</p><button className="button button-primary" onClick={onBack}>Choose an expedition</button></div>)}
    <p className="board-footnote">Best scores per explorer · Top 50 · Scores shared across devices · Names are optional</p>
  </main>
}
export function ScoreSubmission({ missionId, rounds, category, onLeaderboard }: {
  missionId: string | null; rounds: RoundResult[]; category: CategoryId; onLeaderboard: (category: BoardId) => void;
}) {
  const [anonymous, setAnonymous] = useState(true)
  const [name, setName] = useState(() => { try { return localStorage.getItem('galaxyguessr-name') ?? '' } catch { return '' } })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  return <section className="score-submission"><div><span className="eyebrow section-kicker">A PLACE AMONG THE EXPLORERS</span><h2>Leave your mark.</h2><p>Post your score to the {categories.find(c => c.id === category)?.name} leaderboard.</p></div>
    {saved ? <div className="submission-success" role="status"><CheckCircle2 size={22} /><span>Score posted {anonymous ? 'anonymously' : `as ${name.trim()}`}.</span><button className="text-button" onClick={() => onLeaderboard(category)}>View leaderboard →</button></div>
      : <form onSubmit={async event => {
        event.preventDefault(); if (saving || !missionId) return
        setSaving(true); setError('')
        try { await api('/api/scores', { missionId, rounds, anonymous, name }); setSaved(true)
          if (!anonymous) { try { localStorage.setItem('galaxyguessr-name', name.trim()) } catch { /* Optional preference. */ } }
        } catch (e) { setError(e instanceof Error ? e.message : 'Unable to post score. Please try again.') }
        finally { setSaving(false) }
      }}><label className="anonymous-toggle"><input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} disabled={saving} />Post anonymously</label>
        {!anonymous && <label className="explorer-name">Unique explorer name<input value={name} onChange={e => setName(e.target.value)} minLength={3} maxLength={20} required autoComplete="nickname" placeholder="e.g. OrbitExplorer" disabled={saving} /><small>3–20 letters, numbers, spaces, hyphens, or underscores. Your name is reserved for this browser.</small></label>}
        <p className="privacy-note">Posting anonymously hides your name on all leaderboards. Your score is shared only when you post it.</p>
        {!missionId && <p role="status" className="form-error">This expedition was played offline. Start a new expedition with a connection to post a score.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="submission-actions"><button className="button button-primary" disabled={saving || !missionId}>{saving ? <LoaderCircle className="spin" size={17} /> : <Trophy size={17} />}{saving ? 'Posting…' : 'Post score'}</button><button type="button" className="text-button" onClick={() => onLeaderboard(category)}>View leaderboard →</button></div>
      </form>}
  </section>
}
