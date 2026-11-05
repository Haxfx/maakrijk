/**
 * Illustrated lemonade stand, seen from the front like the designs in
 * docs/design/. Shows the server's view; never changes game state.
 * `update(view)` shows upgrades, the jug and the till; customers walk by for
 * every sold cup and `tapped()` squeezes the press. Animations carry no value.
 */
import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three'
import type { Stage, Ticker } from '../stage'
import type { Bounds, Projection } from '../view'
import { type ArtItem, sprite } from '../sprites'
import type { LemonadeView } from './types'

/** Front view: x is left/right, "z" in Bounds is height (see view.ts). */
export const LEMONADE_PROJECTION: Projection = 'front'
// Compact around the stand, so phones show it large; the rest is scenery.
export const LEMONADE_BOUNDS: Bounds = { minX: -3.75, maxX: 3.75, minZ: -1.1, maxZ: 7.1 }
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
  signClosed: A('sign-closed', 1.1, 1.1),
  signOpen: A('sign-open', 1.1, 1.1),
  want: A('want', 0.9, 0.84),
  lemonTree: A('lemon-tree', 2, 2.6),
  sprout: A('sprout', 0.9, 1.1),
  helpSign: A('help-sign', 1.1, 1.5),
  apron: A('apron', 0.7, 0.8),
  kids: [A('kid-1', 1.35, 2.7), A('kid-2', 1.35, 2.7), A('kid-3', 1.35, 2.7), A('kid-4', 1.35, 2.7)],
} as const

// Layout (world units). y is the bottom of a sprite; z is the drawing layer.
const COUNTER_TOP = 2.12
const PRESS = { x: -1.7, scale: 1.5 }
const JUG = new Vector3(-0.45, COUNTER_TOP, -4)
const JUG_FILL_BOTTOM = COUNTER_TOP + 0.1
const TILL = new Vector3(2.2, COUNTER_TOP, -4)
const JAR = { x: -2.85, y: COUNTER_TOP, scale: 0.75 }
const CRATE = { x: -1.9, y: 0.15 }
const TREE = { x: -3.0, y: 0, scale: 0.8 }
const SIGN = { x: 0.65, y: -0.4 }
/** The big lemon sign on the awning: tap it for advertising. */
const ADVERT = { x: 0, y: 5.35 }
/** Helpers stand behind the counter, so it hides their legs. */
const HELPER_X = [1.0, 3.0]
const HELPER_FEET = 1.15
const FEET_Y = -0.45
const OFF_RIGHT = 9.5
const OFF_LEFT = -9.5
/** At most this many customers walk at once; more sales only show coins. */
const MAX_WALKERS = 3

/** Where the child can tap. World units: x centre, y bottom, width, height. */
export interface WorldSpot {
  id: SpotId
  x: number
  y: number
  w: number
  h: number
}

/** press: sell; press-up / helper / advert / tree: open the upgrade; till: stats; jug: shows cups. */
const SPOTS = {
  press: { x: PRESS.x, y: COUNTER_TOP - 0.1, w: 1.8, h: 1.25 },
  'press-up': { x: PRESS.x, y: COUNTER_TOP + 1.2, w: 0.6, h: 0.6 },
  jug: { x: JUG.x, y: COUNTER_TOP, w: 1.3, h: 1.6 },
  till: { x: TILL.x, y: COUNTER_TOP, w: 1.3, h: 1.0 },
  helper: { x: SIGN.x, y: SIGN.y, w: 1.1, h: 1.5 },
  advert: { x: ADVERT.x, y: ADVERT.y, w: 2.2, h: 1.7 },
  tree: { x: TREE.x, y: TREE.y, w: 1.4, h: 1.6 },
} as const
export type SpotId = keyof typeof SPOTS

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

export class LemonadeWorld {
  private coinPile: Mesh[] = []
  private jugFill: Mesh
  private press: Mesh
  private helpers: Group[] = []
  private tree: Mesh
  private sprout: Mesh
  private sign: Mesh
  private advert: Mesh
  private till: Mesh
  private walkers = 0
  private nextKid = 0
  private sold: number | null = null
  private liveKey = ''
  private squeeze: Ticker | null = null

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
      [-4.7, 1.0, -7, 1.05],
      [4.8, 1.1, -7, 1],
      [-8.4, 0.5, -6.8, 1.25],
      [8.6, 0.6, -6.8, 1.15],
    ] as const) {
      root.add(s(a.tree, x, y, z, sc))
    }
    root.add(s(a.bush, -4.6, -1.15, 0.5, 0.85), s(a.bush, 6.2, -1.25, 0.5, 0.9))

    // The stand: back wall, helpers behind the counter, counter front, awning and sign.
    root.add(s(a.stallBack, 0, 0.8, -5))
    for (const [i, x] of HELPER_X.entries()) {
      const g = new Group()
      g.add(s(a.kids[(i + 1) % a.kids.length]!, 0, 0, 0))
      g.add(s(a.apron, 0, 0.62, 0.01))
      g.position.set(x, HELPER_FEET, -4.6)
      g.visible = false
      this.helpers.push(g)
      root.add(g)
    }
    root.add(s(a.counter, 0, 0.8, -3))
    root.add(s(a.awning, 0, 3.9, -2))
    this.advert = s(a.sign, ADVERT.x, ADVERT.y, -2.1)
    root.add(this.advert)

    // On the counter: the press (tap it!), jug with a fill, cups, till, coins.
    this.press = s(a.press, PRESS.x, COUNTER_TOP, -4, PRESS.scale)
    root.add(this.press)
    this.jugFill = s(a.jugFill, JUG.x, JUG_FILL_BOTTOM, -4.05)
    root.add(this.jugFill, s(a.jug, JUG.x, JUG.y, JUG.z))
    for (const x of [0.45, 0.85, 1.25]) root.add(s(a.cupEmpty, x, COUNTER_TOP, -3.9))
    this.till = s(a.till, TILL.x, TILL.y, TILL.z)
    root.add(this.till)
    for (let i = 0; i < 10; i++) {
      const c = s(a.coinFlat, TILL.x + 0.85, COUNTER_TOP + i * 0.09, -3.99 + i * 0.001)
      c.visible = false
      this.coinPile.push(c)
      root.add(c)
    }

    // Sugar jar and a full lemon crate: ingredients are bought per jug.
    root.add(s(a.jarBack, JAR.x, JAR.y, -4.2, JAR.scale))
    for (const [dx, dy] of [
      [-0.16, 0.07],
      [0.08, 0.07],
      [-0.05, 0.28],
      [0.16, 0.28],
    ] as const) {
      root.add(s(a.sugar, JAR.x + dx, JAR.y + dy, -4.15, JAR.scale))
    }
    root.add(s(a.jar, JAR.x, JAR.y, -4.1, JAR.scale))
    root.add(s(a.crateBack, CRATE.x, CRATE.y + 0.05, -1.2))
    for (let i = 0; i < 12; i++) {
      const row = Math.floor(i / 4)
      const col = i % 4
      root.add(s(a.lemon, CRATE.x - 0.6 + col * 0.4 + (row % 2) * 0.2, CRATE.y + 0.86 - row * 0.11, -1.15 + row * 0.01))
    }
    root.add(s(a.crate, CRATE.x, CRATE.y, -1))

    // Upgrades in the world: a sprout that becomes a lemon tree, a help-wanted sign.
    this.sprout = s(a.sprout, TREE.x, TREE.y, -1.3)
    this.tree = s(a.lemonTree, TREE.x, TREE.y, -1.3, TREE.scale)
    this.tree.visible = false
    this.sign = s(a.helpSign, SIGN.x, SIGN.y, 0.3)
    root.add(this.sprout, this.tree, this.sign)

    stage.add(root)
  }

  /** Tappable places, in world units. */
  spots(): WorldSpot[] {
    return Object.entries(SPOTS).map(([id, r]) => {
      if (id === 'tree' && this.tree.visible) return { id, x: TREE.x, y: TREE.y, w: 1.6, h: 2.0 }
      return { id: id as SpotId, ...r }
    })
  }

  /** A short "no" wobble on a refused tap. Reduced motion: nothing moves. */
  shake(id: SpotId) {
    const obj = {
      press: this.press,
      'press-up': this.press,
      jug: this.press,
      till: this.till,
      helper: this.sign,
      advert: this.advert,
      tree: this.tree.visible ? this.tree : this.sprout,
    }[id]
    const baseX = obj.position.x
    let t = 0
    this.stage.animate((dt, instant) => {
      t += dt
      if (instant || t >= 0.4) {
        obj.position.x = baseX
        return false
      }
      obj.position.x = baseX + Math.sin(t * 45) * 0.06 * (1 - t / 0.4)
      return true
    })
  }

  /** The press squeezes on every tap. Reduced motion: it stands still. */
  tapped() {
    let t = 0
    const base = PRESS.scale
    const squeeze: Ticker = (dt, instant) => {
      t += dt
      if (this.squeeze !== squeeze || instant || t >= 0.18) {
        this.press.scale.set(base, base, 1)
        return false
      }
      const k = Math.sin((t / 0.18) * Math.PI)
      this.press.scale.set(base * (1 + 0.06 * k), base * (1 - 0.12 * k), 1)
      return true
    }
    this.squeeze = squeeze
    this.stage.animate(squeeze)
  }

  update(v: LemonadeView) {
    const level = (id: string) => v.upgrades.find((u) => u.id === id)?.level ?? 0
    const helpers = level('helper')
    this.helpers.forEach((h, i) => (h.visible = i < Math.min(helpers, HELPER_X.length) && (i === 0 || helpers >= 3)))
    const hasTree = level('tree') > 0
    this.tree.visible = hasTree
    this.sprout.visible = !hasTree
    // Advertising makes the big sign grow a little per level.
    const grow = 1 + 0.08 * level('advert')
    this.advert.scale.set(grow, grow, 1)
    this.stage.invalidate()
  }

  /** The live stand between server answers: jug, coins, customers per sold cup. */
  live(l: { jugLeft: number; cupsSold: number; coins: number }, cupsPerJug: number) {
    // Called every tick: only draw when something visible changed.
    const key = `${l.jugLeft}/${cupsPerJug}/${Math.min(10, Math.ceil(l.coins / 10))}/${l.cupsSold}`
    if (key === this.liveKey) return
    this.liveKey = key
    const fill = l.jugLeft / cupsPerJug
    this.jugFill.visible = fill > 0
    this.jugFill.scale.y = Math.max(0.01, fill)
    this.coinPile.forEach((c, i) => (c.visible = i < Math.min(10, Math.ceil(l.coins / 10))))
    if (this.sold !== null && l.cupsSold > this.sold) this.customersFor(l.cupsSold - this.sold)
    this.sold = Math.max(this.sold ?? 0, l.cupsSold)
    this.stage.invalidate()
  }

  /** Children walk up to the till, pay and leave with a cup. */
  private customersFor(cups: number) {
    for (let i = 0; i < cups && this.walkers < MAX_WALKERS; i++) this.customer(i * 0.5)
    if (cups > 0) this.coinHop()
  }

  private coinHop() {
    const coin = sprite(this.stage, LEMONADE_ART.coin, TILL.x + 0.6, FEET_Y + 2.0, 2)
    this.stage.add(coin)
    this.stage.animate(moveTo(coin, new Vector3(TILL.x, TILL.y + 0.7, 2), 0.5, () => this.remove(coin)))
  }

  private customer(delay: number) {
    this.walkers++
    const kids = LEMONADE_ART.kids
    const g = new Group()
    g.add(sprite(this.stage, kids[this.nextKid++ % kids.length]!, 0, 0, 0))
    g.position.set(OFF_RIGHT + delay * 3, FEET_Y, 1 + (this.nextKid % 20) * 0.02)
    this.stage.add(g)
    const done = () => {
      g.removeFromParent()
      this.walkers--
      this.stage.invalidate()
    }
    this.stage.animate(
      walkTo(g, TILL.x + 0.3, 1.4 + delay, () => {
        const cup = sprite(this.stage, LEMONADE_ART.cup, 0.5, 1.05, 0.01)
        g.add(cup)
        this.stage.animate(walkTo(g, OFF_LEFT, 2.2, done))
      }),
    )
  }

  private remove(m: Mesh) {
    m.removeFromParent()
    m.geometry.dispose()
    this.stage.invalidate()
  }
}
