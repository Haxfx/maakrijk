// Thin fetch wrapper for the Rust API. Errors carry the server's stable `code`.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly field?: string,
  ) {
    super(`${status} ${code}`)
  }
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

let base = ''
let bearer: string | null = null

/** Set once at start from runtime config. Empty means same origin. */
export function configureApi(apiBase: string) {
  base = apiBase.replace(/\/$/, '')
}

/** Native shells send the session token as a header instead of a cookie (D4). */
export function setBearer(token: string | null) {
  bearer = token
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  // Custom header: a cross-site form cannot send it, so cookie requests are CSRF-safe.
  headers['X-Maakrijk'] = '1'
  if (bearer) headers.Authorization = `Bearer ${bearer}`

  let res: Response
  try {
    res = await fetch(`${base}/api${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      credentials: base ? 'include' : 'same-origin',
    })
  } catch {
    throw new ApiError(0, 'offline')
  }
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, data?.code ?? 'unknown', data?.field ?? undefined)
  }
  return data as T
}
