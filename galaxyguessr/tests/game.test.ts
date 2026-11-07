import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMission, scoreRound, locations } from '../src/game.ts'
test('a mission contains five distinct valid destinations', () => {
  for (let i = 0; i < 100; i++) {
    const mission = createMission()
    assert.equal(mission.length, 5)
    assert.equal(new Set(mission.map(x => x.id)).size, 5)
    assert.ok(mission.every(x => locations.some(y => y.id === x.id)))
  }
})
test('scoring rewards correct, quick, unassisted guesses', () => {
  assert.equal(scoreRound(true, 0, 10), 5000)
  assert.equal(scoreRound(true, 1, 10), 4500)
  assert.equal(scoreRound(true, 2, 10), 4000)
  assert.equal(scoreRound(true, 1, 45), 4425)
  assert.equal(scoreRound(true, 2, 100000), 3000)
  assert.equal(scoreRound(false, 0, 0), 0)
})
