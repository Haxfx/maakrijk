import { describe, expect, it } from 'vitest'
import { project } from '~/game/lemonade/useLemonade'
import type { LemonadeView } from '~/game/lemonade/types'

const T0 = Date.parse('2026-11-05T10:00:00Z')
const view = (over: Partial<LemonadeView> = {}): LemonadeView => ({
  coins: 12,
  cupPrice: 2,
  jugCost: 4,
  cupsPerJug: 4,
  cupsPerTap: 1,
  autoMilliCupsPerSecond: 0,
  carryMilli: 0,
  settledTo: new Date(T0).toISOString(),
  perMinute: 0,
  jugLeft: 0,
  upgrades: [],
  stats: { cupsSold: 0, cupsByHelpers: 0, revenue: 0, materials: 0, profit: 0, invested: 0 },
  nextStep: 'wait',
  awayCapMs: 7_200_000,
  ...over,
})
const coins = (v: LemonadeView, c: number, ms: number, taps: number) => project(v, c, T0 + ms, taps).coins

// Must match services/api/src/scenarios/lemonade/rules.rs `settle` and `sell`.
describe('project', () => {
  it('counts taps like the server: the first cup of a jug pays its ingredients', () => {
    expect(coins(view(), 12, 0, 1)).toBe(10)
    expect(coins(view(), 12, 0, 4)).toBe(16)
    expect(coins(view(), 12, 0, 9)).toBe(18)
    expect(coins(view({ jugLeft: 3 }), 10, 0, 3)).toBe(16)
    expect(coins(view({ cupsPerTap: 2 }), 6, 0, 2)).toBe(10)
  })

  it('sells by itself over time, with progress toward the next cup', () => {
    const v = view({ autoMilliCupsPerSecond: 250 })
    expect(project(v, 12, T0 + 2000, 0)).toMatchObject({ coins: 12, progress: 0.5 })
    expect(project(v, 12, T0 + 4000, 0)).toMatchObject({ coins: 10, jugLeft: 3, cupsSold: 1, materials: 4 })
    expect(coins(v, 12, 16_000, 0)).toBe(16)
    // Selling by itself first, then the taps.
    expect(coins(v, 12, 4000, 3)).toBe(16)
  })

  it('carries part of a cup and stops at the away cap', () => {
    const v = view({ autoMilliCupsPerSecond: 250, carryMilli: 900 })
    expect(project(v, 12, T0 + 400, 0).cupsSold).toBe(1)
    const capped = view({ autoMilliCupsPerSecond: 1000, awayCapMs: 10_000 })
    expect(project(capped, 12, T0 + 60_000, 0).cupsSold).toBe(10)
  })

  it('does not sell before the clock has started', () => {
    expect(coins(view({ autoMilliCupsPerSecond: 250, settledTo: null }), 12, 60_000, 0)).toBe(12)
  })
})
