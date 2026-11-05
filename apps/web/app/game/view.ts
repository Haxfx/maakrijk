/**
 * Camera maths for the game stage, free of three.js so it is easy to test.
 * `zoom` is pixels per world unit.
 *
 * - 'iso': the world lies on the ground plane (x, z); the camera looks at
 *   `target` from a fixed isometric angle.
 * - 'front': an illustrated side view, like a picture book. The world is the
 *   (x, y) plane; `targetZ` and `minZ`/`maxZ` then mean height (y).
 */

export type Projection = 'iso' | 'front'

export interface Bounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface ViewState {
  targetX: number
  targetZ: number
  zoom: number
}

/** How much closer than "see everything" the child may zoom in. */
export const MAX_ZOOM_FACTOR = 2.5

/**
 * Screen size of the bounds at zoom 1, for an isometric view (45° yaw, ~35°
 * pitch). Width is the diagonal span; height is squashed by the pitch.
 */
export function projectedSize(b: Bounds, projection: Projection = 'iso'): { w: number; h: number } {
  if (projection === 'front') return { w: b.maxX - b.minX, h: b.maxZ - b.minZ }
  const dx = b.maxX - b.minX
  const dz = b.maxZ - b.minZ
  const w = (dx + dz) * Math.SQRT1_2
  const h = (dx + dz) * Math.SQRT1_2 * Math.sin(Math.PI / 5) + 2 // + headroom for tall props
  return { w, h }
}

/** Zoom at which the whole world fits the viewport with some margin. */
export function fitZoom(b: Bounds, width: number, height: number, margin = 0.08, projection: Projection = 'iso'): number {
  const { w, h } = projectedSize(b, projection)
  const usableW = Math.max(1, width * (1 - 2 * margin))
  const usableH = Math.max(1, height * (1 - 2 * margin))
  return Math.min(usableW / w, usableH / h)
}

export function centre(b: Bounds): { x: number; z: number } {
  return { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 }
}

export function fitView(b: Bounds, width: number, height: number, projection: Projection = 'iso'): ViewState {
  const c = centre(b)
  const margin = marginFor(projection)
  const zoom = fitZoom(b, width, height, margin, projection)
  if (projection === 'front') return { targetX: c.x, targetZ: Math.max(c.z, standingTarget(b, width, height, zoom)), zoom }
  return { targetX: c.x, targetZ: c.z, zoom }
}

/**
 * Front view on a tall screen: the target height at which the bounds' bottom
 * stands one side-margin above the screen bottom, so extra room shows sky
 * instead of empty ground.
 */
function standingTarget(b: Bounds, width: number, height: number, zoom: number): number {
  return b.minZ - (width * marginFor('front')) / zoom + height / zoom / 2
}

/** The front view is a framed picture; it needs less margin. */
function marginFor(projection: Projection): number {
  return projection === 'front' ? 0.03 : 0.08
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Keep the view inside the world: zoom between "all" and MAX_ZOOM_FACTOR × all,
 *  target never outside the bounds. */
export function clampView(v: ViewState, b: Bounds, width: number, height: number, projection: Projection = 'iso'): ViewState {
  const fit = fitZoom(b, width, height, marginFor(projection), projection)
  const zoom = clamp(v.zoom, fit, fit * MAX_ZOOM_FACTOR)
  const maxZ = projection === 'front' ? Math.max(b.maxZ, standingTarget(b, width, height, zoom)) : b.maxZ
  return {
    zoom,
    targetX: clamp(v.targetX, b.minX, b.maxX),
    targetZ: clamp(v.targetZ, b.minZ, maxZ),
  }
}

/**
 * Move the target by a screen drag of (dx, dy) pixels. Screen right maps to
 * world (+x, -z) and screen down to (+x, +z) for the isometric camera.
 */
export function panBy(v: ViewState, dx: number, dy: number, projection: Projection = 'iso'): ViewState {
  const s = 1 / v.zoom
  // Front view: drag right moves the picture right, so the target goes left.
  if (projection === 'front') return { zoom: v.zoom, targetX: v.targetX - dx * s, targetZ: v.targetZ + dy * s }
  const right = dx * s * Math.SQRT1_2
  const down = (dy * s * Math.SQRT1_2) / Math.sin(Math.PI / 5)
  return {
    zoom: v.zoom,
    targetX: v.targetX - right - down,
    targetZ: v.targetZ + right - down,
  }
}

export function sameView(a: ViewState, b: ViewState, eps = 1e-6): boolean {
  return Math.abs(a.zoom - b.zoom) < eps && Math.abs(a.targetX - b.targetX) < eps && Math.abs(a.targetZ - b.targetZ) < eps
}
