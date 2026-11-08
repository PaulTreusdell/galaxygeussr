import { locations } from './game'
import type { CategoryId } from './game'

export type SceneId = 'universe' | 'milky-way' | 'solar-system' | 'earth' | 'jupiter' | 'saturn'
export type AtlasNode = { id: string; x: number; y: number; label?: string; enter?: SceneId }
export type AtlasScene = { name: string; subtitle: string; parent?: SceneId; kind: 'galaxies' | 'galaxy' | 'system'; nodes: AtlasNode[] }

// An explorable schematic atlas, not measured coordinates or current ephemerides.
// Stellar types and phenomena represent examples rather than named sky positions.
export const atlasScenes: Record<SceneId, AtlasScene> = {
  universe: { name: 'Galaxies', subtitle: 'Islands of stars', kind: 'galaxies', nodes: [
    { id: 'milky-way', label: 'Milky Way', x: 445, y: 350, enter: 'milky-way' },
    { id: 'andromeda', x: 700, y: 180 }, { id: 'triangulum', x: 820, y: 360 },
    { id: 'magellanic', x: 270, y: 480 }, { id: 'whirlpool', x: 200, y: 160 },
    { id: 'sombrero', x: 710, y: 510 }, { id: 'lens', x: 460, y: 100 },
  ] },
  'milky-way': { name: 'Milky Way', subtitle: 'Follow the spiral arms', parent: 'universe', kind: 'galaxy', nodes: [
    { id: 'solar-system', label: 'Solar System', x: 720, y: 405, enter: 'solar-system' },
    { id: 'blackhole', x: 500, y: 315 }, { id: 'white-dwarf', x: 265, y: 205 },
    { id: 'red-supergiant', x: 745, y: 180 }, { id: 'protostar', x: 380, y: 480 },
    { id: 'red-dwarf', x: 800, y: 525 }, { id: 'pulsar', x: 190, y: 425 },
    { id: 'supernova', x: 500, y: 140 }, { id: 'nebula', x: 620, y: 535 },
  ] },
  'solar-system': { name: 'Solar System', subtitle: 'Planets, moons & icy travelers', parent: 'milky-way', kind: 'system', nodes: [
    { id: 'sun', x: 500, y: 320 }, { id: 'mercury', x: 565, y: 275 },
    { id: 'venus', x: 405, y: 265 }, { id: 'earth', label: 'Earth', x: 485, y: 435, enter: 'earth' },
    { id: 'mars', x: 675, y: 350 }, { id: 'jupiter', x: 315, y: 430, enter: 'jupiter' },
    { id: 'saturn', x: 785, y: 235, enter: 'saturn' }, { id: 'pluto', x: 165, y: 165 },
    { id: 'ceres', x: 300, y: 255 }, { id: 'vesta', x: 620, y: 165 },
    { id: 'bennu', x: 590, y: 470 }, { id: 'eros', x: 740, y: 470 },
    { id: 'halley', x: 135, y: 365 }, { id: '67p', x: 420, y: 535 },
    { id: 'tempel', x: 855, y: 390 }, { id: 'wild', x: 445, y: 115 }, { id: 'hartley', x: 260, y: 545 },
  ] },
  earth: { name: 'Earth system', subtitle: 'Our nearest neighbor', parent: 'solar-system', kind: 'system', nodes: [
    { id: 'earth', label: 'Earth', x: 420, y: 320 }, { id: 'moon', x: 690, y: 290 },
  ] },
  jupiter: { name: 'Jupiter system', subtitle: 'The Galilean neighborhood', parent: 'solar-system', kind: 'system', nodes: [
    { id: 'jupiter', x: 470, y: 320 }, { id: 'io', x: 615, y: 220 }, { id: 'europa', x: 760, y: 425 },
  ] },
  saturn: { name: 'Saturn system', subtitle: 'Worlds beyond the rings', parent: 'solar-system', kind: 'system', nodes: [
    { id: 'saturn', x: 450, y: 320 }, { id: 'enceladus', x: 625, y: 210 }, { id: 'titan', x: 780, y: 420 },
  ] },
}

export function initialScene(category: CategoryId): SceneId {
  if (category === 'all' || category === 'galaxies') return 'universe'
  if (category === 'stars' || category === 'exotic') return 'milky-way'
  return 'solar-system'
}
export function sceneForDestination(id: string): SceneId {
  return (Object.entries(atlasScenes).find(([, scene]) => scene.nodes.some(node => node.id === id))?.[0] ?? 'universe') as SceneId
}
export function scenePath(id: SceneId): SceneId[] {
  const parent = atlasScenes[id].parent
  return parent ? [...scenePath(parent), id] : [id]
}
export function canGuess(id: string, category: CategoryId): boolean {
  return locations.some(world => world.id === id && (category === 'all' || world.category === category))
}

export type MapCamera = { x: number; y: number; zoom: number }
export const homeCamera: MapCamera = { x: 0, y: 0, zoom: 1 }
export function zoomCamera(camera: MapCamera, factor: number, anchor: { x: number; y: number }): MapCamera {
  const zoom = Math.max(.7, Math.min(3.2, camera.zoom * factor))
  const ratio = zoom / camera.zoom
  return { x: anchor.x - (anchor.x - camera.x) * ratio, y: anchor.y - (anchor.y - camera.y) * ratio, zoom }
}
