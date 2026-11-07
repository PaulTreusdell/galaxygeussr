import { test } from 'node:test'
import assert from 'node:assert/strict'
import { categories, createChoices, createMission, scoreRound, locations, locationsFor } from '../src/game.ts'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
test('a mission contains five distinct valid destinations', () => {
  for (let i = 0; i < 100; i++) {
    const mission = createMission()
    assert.equal(mission.length, 5)
    assert.equal(new Set(mission.map(x => x.id)).size, 5)
    assert.ok(mission.every(x => locations.some(y => y.id === x.id)))
  }
})

test('every specialist expedition uses five distinct objects from its category', () => {
  assert.equal(locations.length, 35)
  assert.equal(new Set(locations.map(w => w.id)).size, 35)
  for (const category of categories.filter(c => c.id !== 'all')) {
    assert.equal(locationsFor(category.id).length, 5)
    for (let i = 0; i < 30; i++) {
      const mission = createMission(category.id)
      assert.equal(mission.length, 5)
      assert.equal(new Set(mission.map(w => w.id)).size, 5)
      assert.ok(mission.every(w => w.category === category.id))
      for (const world of mission) {
        const choices = createChoices(world, category.id)
        assert.equal(choices.length, 5)
        assert.equal(choices.filter(w => w.id === world.id).length, 1)
        assert.ok(choices.every(w => w.category === category.id))
      }
    }
  }
})

test('mixed missions span five categories and choices include the answer exactly once', () => {
  const encountered = new Set<string>()
  for (let i = 0; i < 100; i++) {
    const mission = createMission('all')
    assert.equal(new Set(mission.map(w => w.category)).size, 5)
    for (const world of mission) {
      encountered.add(world.category)
      const choices = createChoices(world, 'all')
      assert.equal(choices.length, 6)
      assert.equal(new Set(choices.map(w => w.id)).size, 6)
      assert.equal(choices.filter(w => w.id === world.id).length, 1)
    }
  }
  assert.equal(encountered.size, 7)
})

test('all images exist and every challenge is independent of its object preview', () => {
  for (const world of locations) {
    const challenge = readFileSync(`public${world.image}`)
    const preview = readFileSync(`public${world.preview}`)
    assert.notEqual(world.image, world.preview)
    assert.notEqual(createHash('sha256').update(challenge).digest('hex'), createHash('sha256').update(preview).digest('hex'))
    assert.ok(readFileSync(`public${world.texture}`).length > 100)
    assert.equal(world.clues.length, 3)
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
