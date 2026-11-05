export interface WebBuild {
  target: string
  gitCommit: string
  dirty: boolean
  builtAt: string
  expectedContract: number
}

export interface ApiVersion {
  api: string
  gitCommit: string
  dirty: boolean
  buildTime: string
  contract: number
  database: string
  migration: number | null
}

export type BuildCheck = { state: 'ok' } | { state: 'older' | 'newer'; server: number; page: number } | { state: 'unknown' }

/** Compare the page's expected contract with what the server says. */
export function compareContract(page: WebBuild, server: ApiVersion | null): BuildCheck {
  if (!server || typeof server.contract !== 'number') return { state: 'unknown' }
  if (server.contract === page.expectedContract) return { state: 'ok' }
  return {
    state: server.contract < page.expectedContract ? 'older' : 'newer',
    server: server.contract,
    page: page.expectedContract,
  }
}

export function commitLabel(commit: string, dirty: boolean) {
  return dirty ? `${commit}+` : commit
}
