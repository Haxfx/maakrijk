/**
 * Illustrated lemonade stand, seen from the front like the designs in
 * docs/design/. Shows the server's view; never changes game state.
 * `update(view)` moves things toward what the server says; `play(events)`
 * adds short animations (cup to customer, coin to the till) that carry no value.
 */
import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three'
import type { Stage, Ticker } from '../stage'
import type { Bounds, Projection } from '../view'
import type { GameEvent } from '../client'
import { type ArtItem, sprite } from '../sprites'
import type { LemonadeCustomer, LemonadeView } from './types'

/** Front view: x is left/right, "z" in Bounds is height (see view.ts). */
export const LEMONADE_PROJECTION: Projection = 'front'
export const LEMONADE_BOUNDS: Bounds = { minX: -5.6, maxX: 5.6, minZ: -1.1, maxZ: 7.1 }
/** Sky colour above the backdrop. */
export const LEMONADE_BACKGROUND = '#9fd8f0'

/**
 * All lemonade art. Sizes are world units (drawn at 100 px = 1 unit).
 * To use painted art: put a PNG with a transparent background in
 * public/art/lemonade/ and change the url here; keep the same proportions.
 */
const A = (name: string, w: number, h: number): ArtItem => ({ url: `/art/lemonade/${name}.svg`, w, h })
export const LEMONADE_ART = {
  backdrop: A('backdrop', 40, 9),
  ground: A('ground', 40, 3.6),
  tree: A('tree', 2.6, 3.4),
  bush: A('bush', 2.4, 1.3),
  stallBack: A('stall-back', 6.4, 3.4),
  awning: A('awning', 7.2, 1.7),
  sign: A('sign', 2.2, 1.7),
  counter: A('counter', 6.6, 1.4),
  jug: A('jug', 1.3, 1.6),
  jugFill: A('jug-fill', 0.8, 1),
  cup: A('cup', 0.5, 0.64),
  cupEmpty: A('cup-empty', 0.5, 0.64),
  press: A('press', 1.2, 0.8),
  till: A('till', 1.2, 0.9),
  coin: A('coin', 0.5, 0.5),
  coinFlat: A('coin-flat', 0.56, 0.22),
  crateBack: A('crate-back', 1.9, 1),
  crate: A('crate', 1.9, 0.9),
  lemon: A('lemon', 0.56, 0.42),
  jarBack: A('jar-back', 1, 1.2),
  jar: A('jar', 1, 1.2),
  sugar: A('sugar', 0.3, 0.3),
  chalkboard: A('chalkboard', 1.2, 1.6),
  kids: [A('kid-1', 1.35, 2.7), A('kid-2', 1.35, 2.7), A('kid-3', 1.35, 2.7), A('kid-4', 1.35, 2.7)],
} as const

// Layout (world units). y is the bottom of a sprite; z is the drawing layer.
const COUNTER_TOP = 2.12
const JUG = new Vector3(-0.9, COUNTER_TOP, -4)
const JUG_FILL_BOTTOM = COUNTER_TOP + 0.1
const JUG_FILL_MAX = 1
const TILL = new Vector3(2.1, COUNTER_TOP, -4)
const FEET_Y = -0.45
const OFF_RIGHT = 9.5
const OFF_LEFT = -9.5

function queueX(i: number) {
  return -0.6 + i * 1.35
}

const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2)

/** Ease toward a target over `seconds`; jumps when motion is reduced. */
function moveTo(obj: Group | Mesh, to: Vector3, seconds: number, done?: () => void): Ticker {
  const from = obj.position.clone()
  let t = 0
  return (dt, instant) => {
    t = instant ? seconds : Math.min(seconds, t + dt)
    const k = seconds === 0 ? 1 : t / seconds
    obj.position.lerpVectors(from, to, ease(k))
    if (k >= 1) {
      done?.()
      return false
    }
    return true
  }
}

/** Walk with a small hop per step; reduced motion jumps to the end. */
function walkTo(obj: Group, toX: number, seconds: number, done?: () => void): Ticker {
  const fromX = obj.position.x
  let t = 0
  return (dt, instant) => {
    t = instant ? seconds : Math.min(seconds, t + dt)
    const k = seconds === 0 ? 1 : t / seconds
    obj.position.x = fromX + (toX - fromX) * ease(k)
    obj.position.y = FEET_Y + (k < 1 ? Math.abs(Math.sin(t * 11)) * 0.08 : 0)
    if (k >= 1) {
      done?.()
      return false
    }
    return true
  }
}

interface Customer {
  group: Group
  state: string
  /** Slot target, so a moving customer is not sent twice. */
  targetX: number
  /** The walk in progress; a new walk replaces it. */
  walk?: Ticker
}

export class LemonadeWorld {
  private lemons: Mesh[] = []
  private sugar: Mesh[] = []
  private coinPile: Mesh[] = []
  private jugFill: Mesh
  private press: Mesh
  private customers = new Map<string, Customer>()
  private pressWobble: Ticker | null = null

  constructor(private stage: Stage) {
    const s = (art: ArtItem, x = 0, y = 0, z = 0, scale = 1) => sprite(stage, art, x, y, z, scale)
    const a = LEMONADE_ART
    const root = new Group()

    // Sky, hills and the path.
    root.add(s(a.backdrop, 0, 1.2, -10))
    root.add(s(a.ground, 0, -1.9, -9))
    // Plain grass below the path, for tall (portrait) screens.
    const grass = new Mesh(new PlaneGeometry(80, 30), new MeshBasicMaterial({ color: '#a8d672' }))
    grass.position.set(0, -1.8 - 15 + 0.05, -9.5)
    root.add(grass)

    // Trees and bushes around the stand.
    for (const [x, y, z, sc] of [
      [-5.7, 0.9, -7, 1.1],
      [5.8, 1.0, -7, 1],
      [-8.4, 0.5, -6.8, 1.25],
      [8.6, 0.6, -6.8, 1.15],
    ] as const) {
      root.add(s(a.tree, x, y, z, sc))
    }
    root.add(s(a.bush, -6.6, -1.1, 0.5), s(a.bush, 6.7, -1.25, 0.5, 0.9))

    // The stand: back wall, counter front, awning and sign.
    root.add(s(a.stallBack, 0, 0.8, -5))
    root.add(s(a.counter, 0, 0.8, -3))
    root.add(s(a.awning, 0, 3.9, -2))
    root.add(s(a.sign, 0, 5.35, -2.1))

    // On the counter: press, jug with a fill that rises, cups, till, coins.
    this.press = s(a.press, -2.2, COUNTER_TOP, -4)
    root.add(this.press)
    this.jugFill = s(a.jugFill, JUG.x, JUG_FILL_BOTTOM, -4.05)
    root.add(this.jugFill, s(a.jug, JUG.x, JUG.y, JUG.z))
    for (const x of [0.15, 0.55, 0.95]) root.add(s(a.cupEmpty, x, COUNTER_TOP, -4))
    root.add(s(a.till, TILL.x, TILL.y, TILL.z))
    for (let i = 0; i < 10; i++) {
      const c = s(a.coinFlat, TILL.x + 0.85, COUNTER_TOP + i * 0.09, -3.99 + i * 0.001)
      c.visible = false
      this.coinPile.push(c)
      root.add(c)
    }

    // Lemon crate: 12 places in 3 rows, shown per lemon in stock.
    root.add(s(a.crateBack, -4.4, 0.25, -1.2))
    for (let i = 0; i < 12; i++) {
      const row = Math.floor(i / 4)
      const col = i % 4
      const l = s(a.lemon, -5.0 + col * 0.4 + (row % 2) * 0.2, 1.06 - row * 0.11, -1.15 + row * 0.01)
      l.visible = false
      this.lemons.push(l)
      root.add(l)
    }
    root.add(s(a.crate, -4.4, 0.2, -1))

    // Sugar jar with up to 4 cubes.
    root.add(s(a.jarBack, -2.9, 0.3, -0.97))
    for (const [x, y] of [
      [-3.12, 0.4],
      [-2.82, 0.4],
      [-2.98, 0.68],
      [-2.72, 0.68],
    ] as const) {
      const c = s(a.sugar, x, y, -0.95)
      c.visible = false
      this.sugar.push(c)
      root.add(c)
    }
    root.add(s(a.jar, -2.9, 0.3, -0.9))

    root.add(s(a.chalkboard, 4.6, 0.3, -1.5))

    stage.add(root)
  }

  update(v: LemonadeView) {
    this.lemons.forEach((l, i) => (l.visible = i < v.stock.lemons))
    this.sugar.forEach((c, i) => (c.visible = i < v.stock.sugar))
    const level = v.jug.cups / v.capacity.jugCups
    this.jugFill.visible = level > 0
    this.jugFill.scale.y = Math.max(0.01, level * JUG_FILL_MAX)
    this.coinPile.forEach((c, i) => (c.visible = i < Math.min(10, Math.ceil(v.coins / 4))))
    this.setPressWorking(!!v.jug.making)
    // After closing, the last round's customers are still known from the summary.
    this.updateCustomers(v.round?.id ?? null, v.round?.customers ?? [])
    this.stage.invalidate()
  }

  /** Short, value-free animations for what just happened on the server.
   *  Call before `update` with the same response. */
  play(events: GameEvent[]) {
    for (const e of events) {
      if (e.type !== 'CustomerServed') continue
      const id = (e.data as { customerId: number }).customerId
      const c = [...this.customers.entries()].find(([k]) => k.endsWith(`:${id}`) && !k.startsWith('null'))?.[1]
      if (!c) continue
      // A cup flies from the jug into the child's hand and stays there.
      const cup = sprite(this.stage, LEMONADE_ART.cup, JUG.x, JUG.y + 0.3, 2)
      this.stage.add(cup)
      const hand = new Vector3(c.group.position.x + 0.5, FEET_Y + 1.05, 2)
      this.stage.animate(
        moveTo(cup, hand, 0.45, () => {
          cup.removeFromParent()
          cup.position.set(0.5, 1.05, 0.01)
          c.group.add(cup)
          this.stage.invalidate()
        }),
      )
      // A coin hops from the child to the till.
      const coin = sprite(this.stage, LEMONADE_ART.coin, c.group.position.x, FEET_Y + 1.8, 2)
      this.stage.add(coin)
      this.stage.animate(moveTo(coin, new Vector3(TILL.x, TILL.y + 0.7, 2), 0.6, () => this.remove(coin)))
      // The served child walks off happily, even if the round just closed.
      if (c.state !== 'served') {
        c.state = 'served'
        this.leave(c, OFF_LEFT)
      }
    }
  }

  private remove(m: Mesh) {
    m.removeFromParent()
    m.geometry.dispose()
    this.stage.invalidate()
  }

  /** Start a walk; it replaces any walk this customer was still doing. */
  private walk(c: Customer, toX: number, seconds: number, done?: () => void) {
    c.targetX = toX
    const inner = walkTo(c.group, toX, seconds, done)
    const ticker: Ticker = (dt, instant) => c.walk === ticker && inner(dt, instant)
    c.walk = ticker
    this.stage.animate(ticker)
  }

  private leave(c: Customer, toX: number, done?: () => void) {
    const group = c.group
    this.walk(c, toX, 1.8, () => {
      group.visible = false
      done?.()
    })
  }

  /** The press wobbles while a jug is being made. Reduced motion: it stands still. */
  private setPressWorking(on: boolean) {
    if (on && !this.pressWobble) {
      let t = 0
      const wobble: Ticker = (dt, instant) => {
        if (this.pressWobble !== wobble || instant) {
          this.press.rotation.z = 0
          return false
        }
        t += dt
        this.press.rotation.z = Math.sin(t * 14) * 0.08
        return true
      }
      this.pressWobble = wobble
      this.stage.animate(wobble)
    } else if (!on && this.pressWobble) {
      this.pressWobble = null
      this.press.rotation.z = 0
      this.stage.invalidate()
    }
  }

  private makeCustomer(id: number): Group {
    const g = new Group()
    const kids = LEMONADE_ART.kids
    g.add(sprite(this.stage, kids[(id - 1) % kids.length]!, 0, 0, 0))
    // Later customers stand slightly in front, so the queue overlaps nicely.
    g.position.set(OFF_RIGHT, FEET_Y, 1 + (id % 20) * 0.02)
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
        entry = { group: this.makeCustomer(c.id), state: 'coming', targetX: OFF_RIGHT }
        this.customers.set(key, entry)
      }
      const group = entry.group
      if (c.state === 'waiting') {
        group.visible = true
        const x = queueX(slot++)
        if (entry.targetX !== x) this.walk(entry, x, 1.2)
      } else if ((c.state === 'served' || c.state === 'left') && entry.state !== c.state) {
        if (group.visible) this.leave(entry, c.state === 'served' ? OFF_LEFT : OFF_RIGHT)
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
      if (entry.group.visible && entry.state === 'waiting') this.leave(entry, OFF_RIGHT, done)
      else if (entry.group.visible) this.leave(entry, entry.state === 'served' ? OFF_LEFT : OFF_RIGHT, done)
      else done()
    }
  }
}
