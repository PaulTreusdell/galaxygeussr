import { ArrowRight, BookOpen, LoaderCircle, Rocket, Trophy } from 'lucide-react'
import { categories, locationsFor } from './game'
import type { CategoryId } from './game'

export default function ExpeditionPicker({ category, onCategory, onStart, launching, onExplore, onLeaderboard }: {
  category: CategoryId; onCategory: (category: CategoryId) => void; onStart: () => void; launching: boolean;
  onExplore: () => void; onLeaderboard: () => void;
}) {
  return <main className="expeditions-page page-width">
    <span className="eyebrow section-kicker">CHOOSE YOUR CURIOSITY</span><h1>A universe of expeditions.</h1>
    <p className="page-intro">Pick a corner of the cosmos, or let the whole universe surprise you.</p>
    <div className="category-grid" role="group" aria-label="Expedition category">{categories.map(c => <button
      key={c.id} className={`category-card ${category === c.id ? 'selected' : ''}`} aria-pressed={category === c.id}
      onClick={() => onCategory(c.id)} disabled={launching}>
      <span className="category-symbol" aria-hidden="true">{c.symbol}</span><span className="category-card-copy"><b>{c.name}</b><small>{c.description}</small></span>
      <span className="category-count">{locationsFor(c.id).length} objects <ArrowRight size={15} /></span>
    </button>)}</div>
    <section className="expedition-launch"><div><span className="eyebrow">YOUR NEXT MISSION</span>
      <h2>{categories.find(c => c.id === category)?.name}</h2><p>5 unique destinations · 25,000 points in reach · 2 optional hints per round</p>
      {category === 'all' && <p>Five categories per mission, drawn from all seven.</p>}</div>
      <button className="button button-primary" onClick={onStart} disabled={launching}>{launching ? <LoaderCircle className="spin" size={18} /> : <Rocket size={18} />}{launching ? 'Preparing expedition…' : 'Launch expedition'}<ArrowRight size={18} /></button>
    </section>
    <p className="expedition-map-intro">Every mission uses the star atlas. Pan across galaxies, zoom into star systems, and place your guess on a planet, moon, star, or distant galaxy.</p><div className="expedition-links"><button className="text-button" onClick={onExplore}><BookOpen size={16} /> Browse the field guide</button><button className="text-button" onClick={onLeaderboard}><Trophy size={16} /> View leaderboards</button></div>
  </main>
}
