// Read model of the lemonade idle clicker (services/api/src/scenarios/lemonade/rules.rs `view`).

export type UpgradeId = 'press' | 'helper' | 'advert' | 'tree'
/** 'wait' (keep saving) or 'upgrade:<id>': the cheapest affordable upgrade that speeds up selling by itself. */
export type NextStep = 'wait' | `upgrade:${UpgradeId}`

export interface LemonadeUpgrade {
  id: UpgradeId
  level: number
  maxLevel: number
  /** Null at the highest level. */
  nextPrice: number | null
  /** Effect now and after buying: cups per tap (press), cups per minute by itself
   *  (helper, advert) or coins per jug (tree). `next` is null at the highest level. */
  now: number
  next: number | null
}

export interface LemonadeStats {
  cupsSold: number
  cupsByHelpers: number
  revenue: number
  materials: number
  profit: number
  invested: number
}

export interface LemonadeView {
  coins: number
  cupPrice: number
  jugCost: number
  cupsPerJug: number
  cupsPerTap: number
  /** Thousandths of a cup the stand sells by itself per second. */
  autoMilliCupsPerSecond: number
  /** Part of the next cup already made, and the time it was counted to. */
  carryMilli: number
  settledTo: string | null
  /** Coins per minute by itself, after ingredients. */
  perMinute: number
  jugLeft: number
  upgrades: LemonadeUpgrade[]
  stats: LemonadeStats
  nextStep: NextStep
  awayCapMs: number
}

export type LemonadeCommand =
  | { type: 'tap'; count: number }
  | { type: 'buyUpgrade'; upgrade: UpgradeId }
  | { type: 'collect' }

/** Event data (services/api/src/scenarios/lemonade/rules.rs). */
export interface SoldData {
  cups: number
  revenue: number
  materials: number
}
export interface AwayData extends SoldData {
  awayMs: number
  capped: boolean
}
