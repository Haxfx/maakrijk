// Read model of the lemonade stand (services/api/src/scenarios/lemonade/rules.rs `view`).

export type NextStep = 'buy' | 'make' | 'open' | 'serve' | 'wait' | 'summary'
export type CustomerState = 'coming' | 'waiting' | 'served' | 'left'

export interface LemonadeCustomer {
  id: number
  state: CustomerState
  arrivesAt: string
}

export interface LemonadeSummary {
  roundId: number
  sold: number
  materials: number
  left: number
  cupsSold: number
  customers: number
  seen: boolean
}

export interface LemonadeView {
  stateSchema: number
  balanceVersion: string
  prices: { lemon: number; sugar: number; cup: number }
  capacity: { lemons: number; sugar: number; jugCups: number }
  recipe: { lemons: number; sugar: number; cups: number; durationMs: number }
  stock: { lemons: number; sugar: number }
  forOneJug: { lemons: number; sugar: number }
  jug: { cups: number; making: { startedAt: string; doneAt: string; msLeft: number } | null }
  round: {
    id: number
    openedAt: string
    customers: LemonadeCustomer[]
    served: number
    demand: number
    sold: number
  } | null
  roundsPlayed: number
  lastRound: LemonadeSummary | null
  nextStep: NextStep
  coins: number
}

export type LemonadeCommand =
  | { type: 'buyStock'; lemons: number; sugar: number }
  | { type: 'makeJug' }
  | { type: 'openStand' }
  | { type: 'serveCustomer'; customerId: number }
  | { type: 'closeRound' }
  | { type: 'seenRound'; roundId: number }
