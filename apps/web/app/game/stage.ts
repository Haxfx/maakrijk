/**
 * Shared three.js stage for every scenario (release plan 0.2 §6).
 *
 * - Orthographic camera, isometric or front (picture-book) view, with "see
 *   everything", bounded pan and zoom.
 * - One render loop. It only runs while something changes or animates, and it
 *   stops while the tab is hidden.
 * - Reduced motion: animations jump to their end, so we only draw on change.
 * - `dispose()` frees every GPU resource; call it when leaving the page.
 *
 * The stage never decides game state. Scenes show what the server says.
 */
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Mesh,
  type Object3D,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { type Bounds, type Projection, type ViewState, clampView, fitView, panBy, sameView } from './view'

/** Pitch of the isometric camera; must match the maths in view.ts. */
const PITCH = Math.PI / 5
const YAW = Math.PI / 4
const DISTANCE = 60

/** An animation step. Returns false when it is finished. With `instant` the
 *  animation must jump straight to its end state and return false. */
export type Ticker = (dtSeconds: number, instant: boolean) => boolean

export interface StageOptions {
  bounds: Bounds
  /** 'iso' (default) or 'front' for illustrated side-view worlds. */
  projection?: Projection
  reducedMotion: boolean
  background?: string
  /** Called after the camera moved (pan, zoom, resize, see all). */
  onViewChange?: () => void
}

export function hasWebGL(canvas?: HTMLCanvasElement): boolean {
  try {
    const c = canvas ?? document.createElement('canvas')
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}

export class Stage {
  readonly scene = new Scene()
  readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 200)
  private renderer: WebGLRenderer
  private bounds: Bounds
  readonly projection: Projection
  private view: ViewState = { targetX: 0, targetZ: 0, zoom: 1 }
  private width = 1
  private height = 1
  private reducedMotion: boolean
  private onViewChange?: () => void
  private tickers = new Set<Ticker>()
  private dirty = true
  private frame = 0
  private last = 0
  private disposed = false
  private resizeObserver?: ResizeObserver
  private pointers = new Map<number, { x: number; y: number }>()
  private pinchDistance = 0
  private renderListeners = new Set<() => void>()
  /** Number of frames drawn, for tests and diagnostics. */
  frames = 0

  constructor(
    private canvas: HTMLCanvasElement,
    options: StageOptions,
  ) {
    this.bounds = options.bounds
    this.projection = options.projection ?? 'iso'
    this.reducedMotion = options.reducedMotion
    this.onViewChange = options.onViewChange
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.scene.background = new Color(options.background ?? '#cfe8c4')

    this.scene.add(new AmbientLight('#ffffff', 1.6))
    const sun = new DirectionalLight('#fff3d6', 2.2)
    sun.position.set(8, 14, 6)
    this.scene.add(sun)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
    document.addEventListener('visibilitychange', this.onVisibility)
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerUp)
    canvas.addEventListener('wheel', this.onWheel, { passive: false })
    this.resize()
    this.seeAll()
  }

  add(obj: Object3D) {
    this.scene.add(obj)
    this.invalidate()
  }

  setReducedMotion(on: boolean) {
    this.reducedMotion = on
    this.invalidate()
  }

  /** Called after every drawn frame (camera moved or something animated).
   *  Returns a function that stops listening. */
  onRender(cb: () => void): () => void {
    this.renderListeners.add(cb)
    return () => this.renderListeners.delete(cb)
  }

  /** Screen position (CSS px, relative to the canvas) of a world point. */
  toScreen(x: number, y: number, z: number): { x: number; y: number } {
    const v = new Vector3(x, y, z).project(this.camera)
    return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height }
  }

  /** Run an animation until it reports it is done. */
  animate(t: Ticker) {
    this.tickers.add(t)
    this.invalidate()
  }

  /** Request one frame. */
  invalidate() {
    this.dirty = true
    this.schedule()
  }

  /** "Alles bekijken": show the whole world. */
  seeAll() {
    this.setView(fitView(this.bounds, this.width, this.height, this.projection))
  }

  getView(): ViewState {
    return { ...this.view }
  }

  setView(v: ViewState) {
    const next = clampView(v, this.bounds, this.width, this.height, this.projection)
    if (sameView(next, this.view) && !this.dirty) return
    this.view = next
    this.applyCamera()
    this.invalidate()
  }

  /** True when the view shows everything (used to hide "Alles bekijken"). */
  isSeeingAll(): boolean {
    return sameView(this.view, clampView(fitView(this.bounds, this.width, this.height, this.projection), this.bounds, this.width, this.height, this.projection), 1e-3)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.frame)
    this.resizeObserver?.disconnect()
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerUp)
    this.canvas.removeEventListener('wheel', this.onWheel)
    this.tickers.clear()
    this.renderListeners.clear()
    this.scene.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose()
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        mats.forEach((m) => {
          ;(m as { map?: { dispose(): void } | null }).map?.dispose()
          m.dispose()
        })
      }
    })
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }

  // --- loop ---------------------------------------------------------------

  private schedule() {
    if (this.disposed || this.frame || document.hidden) return
    this.frame = requestAnimationFrame(this.tick)
  }

  private tick = (time: number) => {
    this.frame = 0
    if (this.disposed) return
    const dt = this.last ? Math.min(0.1, (time - this.last) / 1000) : 0
    this.last = time
    for (const t of [...this.tickers]) {
      if (!t(dt, this.reducedMotion)) this.tickers.delete(t)
    }
    this.renderer.render(this.scene, this.camera)
    this.frames++
    for (const cb of this.renderListeners) cb()
    this.dirty = false
    if (this.tickers.size > 0) this.schedule()
    else this.last = 0
  }

  private onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.frame)
      this.frame = 0
      this.last = 0
    } else {
      this.invalidate()
    }
  }

  // --- camera -------------------------------------------------------------

  private resize() {
    const w = this.canvas.clientWidth || 1
    const h = this.canvas.clientHeight || 1
    if (w === this.width && h === this.height) return
    const wasAll = this.isSeeingAll()
    this.width = w
    this.height = h
    this.renderer.setSize(w, h, false)
    if (wasAll) this.view = fitView(this.bounds, w, h, this.projection)
    this.view = clampView(this.view, this.bounds, w, h, this.projection)
    this.applyCamera()
    this.invalidate()
  }

  private applyCamera() {
    const { zoom, targetX, targetZ } = this.view
    const halfW = this.width / 2 / zoom
    const halfH = this.height / 2 / zoom
    Object.assign(this.camera, { left: -halfW, right: halfW, top: halfH, bottom: -halfH })
    if (this.projection === 'front') {
      this.camera.position.set(targetX, targetZ, DISTANCE)
      this.camera.lookAt(targetX, targetZ, 0)
      this.camera.updateProjectionMatrix()
      this.onViewChange?.()
      return
    }
    const target = new Vector3(targetX, 0, targetZ)
    const offset = new Vector3(
      Math.cos(PITCH) * Math.sin(YAW),
      Math.sin(PITCH),
      Math.cos(PITCH) * Math.cos(YAW),
    ).multiplyScalar(DISTANCE)
    this.camera.position.copy(target).add(offset)
    this.camera.lookAt(target)
    this.camera.updateProjectionMatrix()
    this.onViewChange?.()
  }

  // --- input --------------------------------------------------------------

  private onPointerDown = (e: PointerEvent) => {
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    this.pinchDistance = this.currentPinch()
  }

  private onPointerMove = (e: PointerEvent) => {
    const prev = this.pointers.get(e.pointerId)
    if (!prev) return
    const next = { x: e.clientX, y: e.clientY }
    this.pointers.set(e.pointerId, next)
    if (this.pointers.size === 1) {
      this.setView(panBy(this.view, next.x - prev.x, next.y - prev.y, this.projection))
    } else if (this.pointers.size === 2) {
      const d = this.currentPinch()
      if (this.pinchDistance > 0 && d > 0) {
        this.setView({ ...this.view, zoom: this.view.zoom * (d / this.pinchDistance) })
      }
      this.pinchDistance = d
    }
  }

  private onPointerUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId)
    this.pinchDistance = this.currentPinch()
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    this.setView({ ...this.view, zoom: this.view.zoom * Math.exp(-e.deltaY * 0.0015) })
  }

  private currentPinch(): number {
    if (this.pointers.size !== 2) return 0
    const [a, b] = [...this.pointers.values()]
    return Math.hypot(a!.x - b!.x, a!.y - b!.y)
  }
}
