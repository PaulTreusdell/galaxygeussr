import locationData from './data/locations.json'
export const categories = [
  { id: 'all', name: 'All space', description: 'A little of everything. One big universe.', symbol: '✦' },
  { id: 'planets', name: 'Planets', description: 'Rocky neighbors and gas giants.', symbol: '◉' },
  { id: 'moons', name: 'Moons', description: 'Ice, oceans, and volcanic satellites.', symbol: '☾' },
  { id: 'minor-planets', name: 'Minor planets', description: 'Dwarf planets and wandering asteroids.', symbol: '⬡' },
  { id: 'stars', name: 'Stars', description: 'From stellar nurseries to fading embers.', symbol: '☀' },
  { id: 'comets', name: 'Comets', description: 'Icy travelers with extraordinary stories.', symbol: '☄' },
  { id: 'exotic', name: 'Exotic phenomena', description: 'The universe at its most unexpected.', symbol: '◎' },
  { id: 'galaxies', name: 'Galaxies', description: 'Whole islands of stars to discover.', symbol: '❋' },
] as const
export type CategoryId = typeof categories[number]['id']
export type Location = typeof locationData[number]
export const locations: Location[] = locationData
export type RoundResult = { locationId: string; guessId: string; hints: number; seconds: number; score: number }
export const MAX_SCORE = 25000
export function isCategory(value: unknown): value is CategoryId {
  return categories.some(c => c.id === value)
}
export function locationsFor(category: CategoryId): Location[] {
  return locations.filter(w => category === 'all' || w.category === category)
}
export function shuffle<T>(items: T[], random = Math.random): T[] {
  const pool = [...items]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}
export function createMission(category: CategoryId = 'all', random = Math.random): Location[] {
  if (category === 'all') {
    return shuffle(categories.filter(c => c.id !== 'all'), random).slice(0, 5)
      .map(c => shuffle(locationsFor(c.id), random)[0])
  }
  return shuffle(locationsFor(category), random).slice(0, 5)
}
export function scoreRound(correct: boolean, hints: number, seconds: number): number {
  if (!correct) return 0
  const timePenalty = Math.min(1000, Math.max(0, Math.floor(seconds) - 30) * 5)
  return Math.max(0, 5000 - Math.min(2, Math.max(0, hints)) * 500 - timePenalty)
}
export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
}
export function readBest(category: CategoryId = 'all'): number {
  try { return Number(localStorage.getItem(`galaxyguessr-best-${category}`)) || 0 } catch { return 0 }
}
export function saveBest(score: number, category: CategoryId = 'all') {
  try { localStorage.setItem(`galaxyguessr-best-${category}`, String(Math.max(readBest(category), score))) } catch { /* Private browsing can disable storage. */ }
}
