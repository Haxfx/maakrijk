import { describe, expect, it } from 'vitest'
import { errorText, t } from '~/locales/nl'
import { common } from '~/locales/nl/common'
import { lemonade } from '~/locales/nl/games/lemonade'

/** Walk nested text objects; call functions with sample args. */
function strings(obj: object, prefix = ''): [string, string][] {
  return Object.entries(obj).flatMap(([k, v]): [string, string][] => {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') return [[key, v]]
    if (typeof v === 'function') return [[key, String(v('Luca', 2, 3))]]
    return strings(v as object, key)
  })
}

// Refusal codes from docs/build/contracts/0.2-game-core.md §5.
const CONTRACT_REFUSALS = ['not_enough_coins', 'would_get_stuck', 'max_level', 'too_fast', 'invalid_command']

describe('texts', () => {
  it('has no empty strings', () => {
    for (const [key, value] of strings(t)) expect(value.trim(), key).not.toBe('')
  })

  it('has a Dutch text for every contract refusal code', () => {
    for (const code of CONTRACT_REFUSALS) expect(errorText(code), code).not.toBe(t.errors.unknown)
  })

  it('game files do not silently override shared texts', () => {
    const shared = new Set(Object.keys(common))
    for (const key of Object.keys(lemonade)) if (key !== 'errors') expect(shared.has(key), key).toBe(false)
    for (const code of Object.keys(lemonade.errors)) expect(code in common.errors, code).toBe(false)
  })

  it('uses Dutch possessives', () => {
    expect(t.lemonade.title('Luca')).toBe("Luca's Limonade")
    expect(t.lemonade.title('Noor')).toBe('Noors Limonade')
    expect(t.lemonade.title('Thomas')).toBe("Thomas' Limonade")
  })
})
