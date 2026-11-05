import { describe, expect, it } from 'vitest'
import { coinsAfterTaps } from '~/game/lemonade/useLemonade'
import type { LemonadeView } from '~/game/lemonade/types'

const view = (over: Partial<LemonadeView> = {}): LemonadeView => ({
  coins: 12,
  cupPrice: 2,
  jugCost: 4,
  cupsPerJug: 4,
  cupsPerTap: 1,
  helperMilliCupsPerSecond: 0,
  perMinute: 0,
  jugLeft: 0,
  upgrades: [],
  stats: { cupsSold: 0, cupsByHelpers: 0, revenue: 0, materials: 0, profit: 0, invested: 0 },
  nextStep: 'tap',
  awayCapMs: 7_200_000,
  ...over,
})

// Must match services/api/src/scenarios/lemonade/rules.rs `sell`.
describe('coinsAfterTaps', () => {
  it('counts the first jug on the first tap', () => {
    expect(coinsAfterTaps(view(), 12, 1)).toBe(10)
    expect(coinsAfterTaps(view(), 12, 4)).toBe(16)
    expect(coinsAfterTaps(view(), 12, 9)).toBe(18)
  })
  it('uses cups left in the jug and a better press', () => {
    expect(coinsAfterTaps(view({ jugLeft: 3 }), 10, 3)).toBe(16)
    expect(coinsAfterTaps(view({ cupsPerTap: 2 }), 6, 2)).toBe(10)
  })
  it('changes nothing without taps', () => {
    expect(coinsAfterTaps(view(), 7, 0)).toBe(7)
  })
})
