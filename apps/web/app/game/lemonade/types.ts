// Read model of the lemonade clicker (services/api/src/scenarios/lemonade/rules.rs `view`).

export type UpgradeId = 'press' | 'helper' | 'tree'
/** 'tap' or 'upgrade:<id>' (the cheapest upgrade the child can afford). */
export type NextStep = 'tap' | `upgrade:${UpgradeId}`

export interface LemonadeUpgrade {
  id: UpgradeId
  level: number
  maxLevel: number
  /** Null at the highest level. */
  nextPrice: number | null
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
  helperMilliCupsPerSecond: number
  /** Coins per minute from helpers, after ingredients. */
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
