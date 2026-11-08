import { test } from 'node:test'
import assert from 'node:assert/strict'
import { atlasScenes, canGuess, homeCamera, initialScene, sceneForDestination, scenePath, zoomCamera } from '../src/atlas.ts'
import type { SceneId } from '../src/atlas.ts'
import { categories, locations, locationsFor } from '../src/game.ts'

test('every mission destination is reachable through the atlas and selectable in its category', () => {
  for (const category of categories) {
    assert.ok(atlasScenes[initialScene(category.id)])
    for (const world of locationsFor(category.id)) {
      const id = sceneForDestination(world.id)
      assert.ok(atlasScenes[id].nodes.some(n => n.id === world.id))
      assert.ok(canGuess(world.id, category.id))
      const path = scenePath(id)
      assert.equal(path[0], 'universe')
      for (let i = 1; i < path.length; i++) {
        assert.ok(atlasScenes[path[i - 1]].nodes.some(n => n.enter === path[i]), `${world.id} needs a working portal into ${path[i]}`)
      }
    }
  }
})

test('specialist missions cannot guess outside their category or select a navigation-only region', () => {
  for (const category of categories.filter(c => c.id !== 'all')) {
    for (const world of locations) assert.equal(canGuess(world.id, category.id), world.category === category.id)
    for (const id of ['milky-way', 'solar-system', 'earth', 'unknown']) assert.equal(canGuess(id, category.id), false)
  }
})

test('moon destinations are placed in their host planetary systems', () => {
  for (const [id, host] of [['moon', 'earth'], ['io', 'jupiter'], ['europa', 'jupiter'], ['titan', 'saturn'], ['enceladus', 'saturn']]) {
    assert.equal(sceneForDestination(id), host)
    assert.equal(atlasScenes[host as SceneId].parent, 'solar-system')
  }
})

test('zoom preserves the point under the pointer and clamps extreme input', () => {
  const camera = { x: 70, y: -20, zoom: 1.2 }
  const anchor = { x: 160, y: -95 }
  const zoomed = zoomCamera(camera, 1.5, anchor)
  assert.ok(Math.abs((anchor.x - camera.x) / camera.zoom - (anchor.x - zoomed.x) / zoomed.zoom) < 1e-10)
  assert.ok(Math.abs((anchor.y - camera.y) / camera.zoom - (anchor.y - zoomed.y) / zoomed.zoom) < 1e-10)
  assert.equal(zoomCamera(homeCamera, 10000, anchor).zoom, 3.2)
  assert.equal(zoomCamera(homeCamera, .0001, anchor).zoom, .7)
})
