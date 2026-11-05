/**
 * Low-poly lemonade stand. Shows the server's view; never changes game state.
 * `update(view)` moves things toward what the server says; `play(events)`
 * adds short animations (cup to customer, coin to the till) that carry no value.
 */
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  type BufferGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
} from 'three'
import type { Stage, Ticker } from '../stage'
import type { Bounds } from '../view'
import type { GameEvent } from '../client'
import type { LemonadeCustomer, LemonadeView } from './types'

// The playable area: stand, crate, jar and the queue. The ground is much
// larger, so the edges of the screen are always grass.
export const LEMONADE_BOUNDS: Bounds = { minX: -4.6, maxX: 3.4, minZ: -2.4, maxZ: 3.2 }
export const LEMONADE_BACKGROUND = '#9ccc6c'

const mats = new Map<string, MeshStandardMaterial>()
function mat(color: string, opts: { opacity?: number } = {}) {
  const key = `${color}/${opts.opacity ?? 1}`
  let m = mats.get(key)
  if (!m) {
    m = new MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: 0.85,
      transparent: opts.opacity !== undefined,
      opacity: opts.opacity ?? 1,
    })
    mats.set(key, m)
  }
  return m
}

function mesh(geo: BufferGeometry, color: string, x = 0, y = 0, z = 0, opts?: { opacity?: number }) {
  const m = new Mesh(geo, mat(color, opts))
  m.position.set(x, y, z)
  return m
}

const COUNTER_Y = 1.3
const JUG_POS = new Vector3(0.9, COUNTER_Y, -0.9)
const TILL_POS = new Vector3(2.2, COUNTER_Y, -0.9)
const OFF_RIGHT = new Vector3(7.5, 0, 3)
const OFF_LEFT = new Vector3(-7.5, 0, 3.4)
const SHIRTS = ['#e46f4f', '#4f8fe4', '#9b5fc0', '#3f9f6f']
const SKIN = ['#f1c7a0', '#c98e62', '#8d5a3b', '#f6d5b8']

function queueSlot(i: number) {
  return new Vector3(-0.9 + i * 1.05, 0, 0.75)
}

/** Ease toward a target over `seconds`; jumps when motion is reduced. */
function moveTo(obj: Group | Mesh, to: Vector3, seconds: number, done?: () => void): Ticker {
  const from = obj.position.clone()
  let t = 0
  return (dt, instant) => {
    t = instant ? seconds : Math.min(seconds, t + dt)
    const k = seconds === 0 ? 1 : t / seconds
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
    obj.position.lerpVectors(from, to, e)
    if (k >= 1) {
      done?.()
      return false
    }
    return true
  }
}

export class LemonadeWorld {
  private lemons: Mesh[] = []
  private sugar: Mesh[] = []
  private jugFill: Mesh
  private press: Group
  private coinPile: Mesh[] = []
  private customers = new Map<string, { group: Group; state: string }>()
  private personGeo = {
    body: new CylinderGeometry(0.28, 0.36, 0.9, 8),
    head: new SphereGeometry(0.3, 10, 8),
    hat: new CylinderGeometry(0.32, 0.32, 0.1, 10),
  }
  private pressSpin: Ticker | null = null

  constructor(private stage: Stage) {
    const root = new Group()
    const geo = {
      box: new BoxGeometry(1, 1, 1),
      lemon: new IcosahedronGeometry(0.22, 0),
      cube: new BoxGeometry(0.26, 0.26, 0.26),
      coin: new CylinderGeometry(0.16, 0.16, 0.06, 10),
    }

    // Ground and path.
    const grass = mesh(new PlaneGeometry(60, 60), LEMONADE_BACKGROUND)
    grass.rotation.x = -Math.PI / 2
    const path = mesh(new PlaneGeometry(60, 2.6), '#e8cf98', 0, 0.01, 2.3)
    path.rotation.x = -Math.PI / 2
    root.add(grass, path)

    // Trees at the back.
    for (const [x, z, s] of [
      [-5, -3.2, 1.2],
      [4.6, -2.6, 1],
      [-1.5, -3.6, 0.9],
      [4.8, 0.4, 0.8],
      [-7, 0.5, 1],
      [-6, 5.5, 1.1],
      [6.5, 5.5, 0.9],
      [9, -2, 1.2],
    ] as const) {
      root.add(mesh(new CylinderGeometry(0.15, 0.2, 1, 6), '#8a5a35', x, 0.5, z))
      const crown = mesh(new IcosahedronGeometry(0.9 * s, 0), '#4f9a45', x, 1.5 + 0.4 * s, z)
      root.add(crown)
    }

    // Stand: counter, posts and a striped awning.
    const counter = mesh(geo.box, '#f2bb45', 0.3, COUNTER_Y / 2, -0.9)
    counter.scale.set(4.4, COUNTER_Y, 1.3)
    const front = mesh(geo.box, '#e5a52f', 0.3, 0.55, -0.22)
    front.scale.set(4.5, 0.7, 0.08)
    root.add(counter, front)
    for (const x of [-1.85, 2.45]) {
      const post = mesh(geo.box, '#c98a3a', x, 1.6, -1.45)
      post.scale.set(0.16, 3.2, 0.16)
      root.add(post)
    }
    for (let i = 0; i < 8; i++) {
      const stripe = mesh(geo.box, i % 2 ? '#fffcf5' : '#167d8d', -1.9 + i * 0.58 + 0.29, 3.25, -1.1)
      stripe.scale.set(0.58, 0.14, 1.6)
      stripe.rotation.x = 0.22
      root.add(stripe)
    }
    const sign = mesh(new CylinderGeometry(0.42, 0.42, 0.1, 12), '#fffcf5', 0.3, 3.75, -1.3)
    sign.rotation.x = Math.PI / 2
    const signLemon = mesh(geo.lemon, '#ffd84a', 0.3, 3.75, -1.2)
    signLemon.scale.set(1.3, 0.9, 0.5)
    root.add(sign, signLemon)

    // Lemon crate: 12 places (4 × 3), shown per lemon in stock.
    const crate = mesh(geo.box, '#a8743e', -3.4, 0.3, 0.2)
    crate.scale.set(1.9, 0.6, 1.4)
    root.add(crate)
    for (let i = 0; i < 12; i++) {
      const l = mesh(geo.lemon, '#ffd84a', -4.1 + (i % 4) * 0.46, 0.75, -0.2 + Math.floor(i / 4) * 0.42)
      l.scale.set(1.15, 0.9, 0.9)
      l.visible = false
      this.lemons.push(l)
      root.add(l)
    }

    // Sugar jar with 4 cubes.
    root.add(mesh(new CylinderGeometry(0.55, 0.55, 0.9, 10), '#dff1f5', -3.4, 0.45, 1.75, { opacity: 0.55 }))
    for (let i = 0; i < 4; i++) {
      const c = mesh(geo.cube, '#ffffff', -3.55 + (i % 2) * 0.3, 0.15 + Math.floor(i / 2) * 0.28, 1.65 + (i % 2) * 0.12)
      c.visible = false
      this.sugar.push(c)
      root.add(c)
    }

    // Jug on the counter; the yellow fill rises with the cups.
    root.add(mesh(new CylinderGeometry(0.42, 0.36, 1, 12), '#e8f6fb', JUG_POS.x, COUNTER_Y + 0.5, JUG_POS.z, { opacity: 0.45 }))
    this.jugFill = mesh(new CylinderGeometry(0.36, 0.33, 1, 12), '#ffe066', JUG_POS.x, COUNTER_Y, JUG_POS.z)
    root.add(this.jugFill)

    // Lemon press next to the jug; it spins while a jug is being made.
    this.press = new Group()
    this.press.position.set(-0.6, COUNTER_Y, -0.9)
    this.press.add(mesh(new CylinderGeometry(0.4, 0.45, 0.25, 10), '#d9603b', 0, 0.12, 0))
    this.press.add(mesh(new ConeGeometry(0.25, 0.4, 8), '#ffd84a', 0, 0.45, 0))
    root.add(this.press)

    // Till with a coin pile.
    const till = mesh(geo.box, '#2f7fb0', TILL_POS.x, COUNTER_Y + 0.25, TILL_POS.z)
    till.scale.set(0.8, 0.5, 0.6)
    root.add(till)
    for (let i = 0; i < 10; i++) {
      const c = mesh(geo.coin, '#f2bb45', TILL_POS.x + 0.6, COUNTER_Y + 0.04 + i * 0.065, TILL_POS.z + 0.15)
      c.visible = false
      this.coinPile.push(c)
      root.add(c)
    }

    stage.add(root)
  }

  update(v: LemonadeView) {
    this.lemons.forEach((l, i) => (l.visible = i < v.stock.lemons))
    this.sugar.forEach((c, i) => (c.visible = i < v.stock.sugar))
    const level = v.jug.cups / v.capacity.jugCups
    this.jugFill.visible = level > 0
    this.jugFill.scale.y = Math.max(0.01, level * 0.9)
    this.jugFill.position.y = COUNTER_Y + (level * 0.9) / 2
    this.coinPile.forEach((c, i) => (c.visible = i < Math.ceil(v.coins / 4)))
    this.setPressSpinning(!!v.jug.making)
    // After closing, the last round's customers are still known from the summary.
    this.updateCustomers(v.round?.id ?? null, v.round?.customers ?? [])
    this.stage.invalidate()
  }

  /** Short, value-free animations for what just happened on the server.
   *  Call before `update` with the same response. */
  play(events: GameEvent[]) {
    for (const e of events) {
      if (e.type === 'CustomerServed') {
        const id = (e.data as { customerId: number }).customerId
        const c = [...this.customers.entries()].find(([k]) => k.endsWith(`:${id}`) && !k.startsWith('null'))?.[1]
        if (!c) continue
        const cup = mesh(new CylinderGeometry(0.14, 0.11, 0.3, 8), '#ffe066', JUG_POS.x, COUNTER_Y + 0.4, JUG_POS.z)
        this.stage.add(cup)
        const to = c.group.position.clone().add(new Vector3(0.3, 1.1, 0))
        this.stage.animate(moveTo(cup, to, 0.45, () => this.remove(cup)))
        // The served customer walks off happily, even if the round just closed.
        if (c.state !== 'served') {
          c.state = 'served'
          const group = c.group
          this.stage.animate(moveTo(group, OFF_LEFT, 1.6, () => (group.visible = false)))
        }
      }
    }
  }

  private remove(m: Mesh) {
    m.removeFromParent()
    m.geometry.dispose()
    this.stage.invalidate()
  }

  private setPressSpinning(on: boolean) {
    if (on && !this.pressSpin) {
      this.pressSpin = (dt, instant) => {
        if (!this.pressSpin) return false
        // With reduced motion the press stands still; the DOM shows progress.
        if (instant) return false
        this.press.rotation.y += dt * 4
        return true
      }
      this.stage.animate(this.pressSpin)
    } else if (!on && this.pressSpin) {
      this.pressSpin = null
    }
  }

  private makeCustomer(id: number): Group {
    const g = new Group()
    const shirt = SHIRTS[(id - 1) % SHIRTS.length]!
    const skin = SKIN[(id - 1) % SKIN.length]!
    g.add(mesh(this.personGeo.body, shirt, 0, 0.55, 0))
    g.add(mesh(this.personGeo.head, skin, 0, 1.3, 0))
    g.add(mesh(this.personGeo.hat, '#5a3b26', 0, 1.55, 0))
    g.position.copy(OFF_RIGHT)
    g.visible = false
    this.stage.add(g)
    return g
  }

  private updateCustomers(roundId: number | null, list: LemonadeCustomer[]) {
    const seen = new Set<string>()
    let slot = 0
    for (const c of list) {
      const key = `${roundId}:${c.id}`
      seen.add(key)
      let entry = this.customers.get(key)
      if (!entry) {
        entry = { group: this.makeCustomer(c.id), state: 'coming' }
        this.customers.set(key, entry)
      }
      const group = entry.group
      if (c.state === 'waiting') {
        group.visible = true
        const target = queueSlot(slot++)
        if (!group.position.equals(target)) this.stage.animate(moveTo(group, target, 1))
      } else if ((c.state === 'served' || c.state === 'left') && entry.state !== c.state) {
        const exit = c.state === 'served' ? OFF_LEFT : OFF_RIGHT
        if (group.visible) this.stage.animate(moveTo(group, exit, 1.6, () => (group.visible = false)))
      }
      entry.state = c.state
    }
    // Customers of a finished round walk off and are then removed.
    for (const [key, entry] of this.customers) {
      if (seen.has(key)) continue
      this.customers.delete(key)
      const done = () => {
        entry.group.removeFromParent()
        this.stage.invalidate()
      }
      if (entry.group.visible && entry.state === 'waiting') {
        this.stage.animate(moveTo(entry.group, OFF_RIGHT, 1.6, done))
      } else if (entry.group.visible && (entry.state === 'served' || entry.state === 'left')) {
        // Already walking off; remove after the walk.
        this.stage.animate(moveTo(entry.group, entry.state === 'served' ? OFF_LEFT : OFF_RIGHT, 1.6, done))
      } else {
        done()
      }
    }
  }
}
