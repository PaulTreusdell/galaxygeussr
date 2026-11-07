import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import type { Database, Statement } from '../server/api'

type Query = { sql: string; values: unknown[] }
export function localDatabase(filename: string): Database {
  function execute(statements: Query[], migration?: string, migrationName?: string): unknown[][] {
    const result = spawnSync('python', [path.resolve('scripts/sqlite-bridge.py')], {
      input: JSON.stringify({ path: filename, statements, migration, migrationName }), encoding: 'utf8', windowsHide: true,
    })
    if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr)
    const output = JSON.parse(result.stdout)
    if (output.error) throw new Error(output.error)
    return output.rows
  }
  for (const name of readdirSync('drizzle').filter(n => n.endsWith('.sql')).sort()) execute([], readFileSync('drizzle/' + name, 'utf8'), name.replace('.sql', ''))
  class LocalStatement implements Statement {
    constructor(readonly sql: string, readonly values: unknown[] = []) {}
    bind(...values: unknown[]) { return new LocalStatement(this.sql, values) }
    async first<T>(): Promise<T | null> { return (execute([this])[0][0] as T) ?? null }
    async all<T>() { return { results: execute([this])[0] as T[] } }
    async run() { execute([this]) }
  }
  return { prepare: sql => new LocalStatement(sql), batch: async statements => execute(statements as LocalStatement[]) }
}
