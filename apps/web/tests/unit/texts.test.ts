import { describe, expect, it } from 'vitest'
import { t } from '~/locales/nl'

describe('texts', () => {
  it('has no empty strings', () => {
    for (const [key, value] of Object.entries(t)) {
      expect(value, key).not.toBe('')
    }
  })
})
