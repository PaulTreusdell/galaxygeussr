import locationData from './data/locations.json'
export type Location = typeof locationData[number]
export const locations: Location[] = locationData
export type RoundResult = { locationId: string; guessId: string; hints: number; seconds: number; score: number }
export const MAX_SCORE = 25000
export function createMission(random = Math.random): Location[] {
  const pool = [...locations]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 5)
}
export function scoreRound(correct: boolean, hints: number, seconds: number): number {
  if (!correct) return 0
  const timePenalty = Math.min(1000, Math.max(0, Math.floor(seconds) - 30) * 5)
  return Math.max(0, 5000 - Math.min(2, Math.max(0, hints)) * 500 - timePenalty)
}
export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
}
export function readBest(): number {
  try { return Number(localStorage.getItem('galaxyguessr-best')) || 0 } catch { return 0 }
}
export function saveBest(score: number) {
  try { localStorage.setItem('galaxyguessr-best', String(Math.max(readBest(), score))) } catch { /* Private browsing can disable storage. */ }
}
