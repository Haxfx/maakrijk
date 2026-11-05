/**
 * Illustrated sprites for front-view worlds: a flat picture on a plane,
 * anchored at its bottom centre (where it stands on the ground).
 *
 * Art is listed per game in a manifest (name → file + size in world units),
 * so an SVG can later be swapped for a painted PNG without code changes.
 * Textures load asynchronously; the stage redraws once when they arrive.
 */
import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, type Texture } from 'three'
import type { Stage } from './stage'

export interface ArtItem {
  /** URL of an SVG or PNG under /public. */
  url: string
  /** Size in world units (the stage's 1 unit; art is drawn at 100 px = 1 unit). */
  w: number
  h: number
}

/** Largest texture side; keeps memory in check on phones. */
const MAX_TEXTURE = 4096
/** Raster SVGs at up to 3× their drawn size so they stay crisp when zoomed. */
const MAX_SCALE = 3

const cache = new Map<string, Promise<Texture>>()

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`art not found: ${url}`))
    img.src = url
  })
}

/** One texture per URL, shared by every sprite that uses it. */
export function loadTexture(url: string): Promise<Texture> {
  let p = cache.get(url)
  if (!p) {
    p = loadImage(url).then((img) => {
      const w = img.naturalWidth || img.width
      const h = img.naturalHeight || img.height
      const scale = Math.min(MAX_SCALE, MAX_TEXTURE / Math.max(w, h))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(w * scale))
      canvas.height = Math.max(1, Math.round(h * scale))
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      const tex = new CanvasTexture(canvas)
      tex.colorSpace = SRGBColorSpace
      tex.anisotropy = 4
      return tex
    })
    cache.set(url, p)
  }
  return p
}

const geometries = new Map<string, PlaneGeometry>()
function anchoredPlane(w: number, h: number): PlaneGeometry {
  const key = `${w}x${h}`
  let g = geometries.get(key)
  if (!g) {
    g = new PlaneGeometry(w, h)
    g.translate(0, h / 2, 0)
    geometries.set(key, g)
  }
  return g
}

/**
 * A sprite at (x, y) on layer z (higher z is in front). Invisible until its
 * texture has loaded, so nothing flashes as a white square.
 */
export function sprite(stage: Stage, art: ArtItem, x = 0, y = 0, z = 0, scale = 1): Mesh {
  const mat = new MeshBasicMaterial({ transparent: true, depthWrite: false })
  // Clone the cached geometry so the stage's dispose() never frees a shared one.
  const mesh = new Mesh(anchoredPlane(art.w, art.h).clone(), mat)
  mesh.position.set(x, y, z)
  mesh.scale.setScalar(scale)
  mat.visible = false
  loadTexture(art.url)
    .then((tex) => {
      mat.map = tex
      mat.visible = true
      mat.needsUpdate = true
      stage.invalidate()
    })
    .catch(() => {
      // Missing art must never break play; the DOM panel still works.
    })
  return mesh
}
