import { describe, expect, it } from 'vitest'
import { commitLabel, compareContract, type ApiVersion, type WebBuild } from '~/utils/buildInfo'

const page: WebBuild = { target: 'preview', gitCommit: 'abc', dirty: false, builtAt: '', expectedContract: 2 }
const server = (contract: number): ApiVersion => ({
  api: '0.1.0',
  gitCommit: 'abc',
  dirty: false,
  buildTime: '',
  contract,
  database: 'maakrijk_test',
  migration: null,
})

describe('compareContract', () => {
  it('is ok when equal', () => expect(compareContract(page, server(2))).toEqual({ state: 'ok' }))
  it('detects an older server', () => expect(compareContract(page, server(1)).state).toBe('older'))
  it('detects a newer server', () => expect(compareContract(page, server(3)).state).toBe('newer'))
  it('is unknown without a server', () => expect(compareContract(page, null)).toEqual({ state: 'unknown' }))
})

describe('commitLabel', () => {
  it('marks dirty builds with +', () => {
    expect(commitLabel('abc', true)).toBe('abc+')
    expect(commitLabel('abc', false)).toBe('abc')
  })
})
