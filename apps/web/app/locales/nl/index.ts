// All Dutch texts, combined from the shared file and one file per game.
// To add a game: create ./games/<game>.ts (texts + errors) and add it below.
import { common, possessive } from './common'
import { lemonade } from './games/lemonade'

export { possessive }

export const t = {
  ...common,
  lemonade: lemonade.lemonade,
  summary: lemonade.summary,
  errors: { ...common.errors, ...lemonade.errors },
} as const

/** Dutch text for an API error code. */
export function errorText(code: string): string {
  const map = t.errors as Record<string, string>
  return map[code] ?? t.errors.unknown
}
