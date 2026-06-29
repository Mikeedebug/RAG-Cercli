import { drizzle as drizzleNode } from 'drizzle-orm/postgres-js'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless'
import * as schema from './schema/index'

function isEdgeRuntime(): boolean {
  return (
    typeof process === 'undefined' ||
    typeof process.versions === 'undefined' ||
    !process.versions.node
  )
}

function createClient() {
  const neonUrl = process.env.NEON_DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl && !neonUrl) {
    throw new Error(
      '[ats/db] No database URL configured. ' +
        'Set DATABASE_URL (standard Postgres) or NEON_DATABASE_URL (Neon serverless).'
    )
  }

  if (neonUrl || isEdgeRuntime()) {
    const url = neonUrl ?? databaseUrl!
    const { Pool } = require('@neondatabase/serverless') as typeof import('@neondatabase/serverless')
    const pool = new Pool({ connectionString: url })
    return drizzleNeon(pool, { schema })
  }

  const postgres = require('postgres') as typeof import('postgres')
  const sql = postgres(databaseUrl!, {
    max: parseInt(process.env.DB_POOL_MAX ?? '10', 10),
    idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT ?? '20', 10),
    connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT ?? '10', 10),
    prepare: process.env.DB_DISABLE_PREPARE !== 'true',
  })
  return drizzleNode(sql, { schema })
}

let _db: ReturnType<typeof createClient> | undefined

export function getDb(): ReturnType<typeof createClient> {
  if (!_db) {
    _db = createClient()
  }
  return _db
}

export const db = getDb()

export type Db = typeof db
