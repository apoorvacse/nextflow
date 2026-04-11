import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

function getEnvFromFile(key: string): string | undefined {
  const envFiles = ['.env.local', '.env']
  for (const file of envFiles) {
    const filePath = path.join(/* turbopackIgnore: true */ process.cwd(), file)
    if (!existsSync(filePath)) continue
    const content = readFileSync(filePath, 'utf8')
    const line = content
      .split(/\r?\n/)
      .find((l) => l.startsWith(`${key}=`))
    if (!line) continue
    const value = line.slice(key.length + 1).trim().replace(/^"(.*)"$/, '$1')
    if (value) return value
  }
  return undefined
}

function resolveDatabaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL?.trim()
  if (fromEnv) return fromEnv
  const fromFile = getEnvFromFile('DATABASE_URL')?.trim()
  if (fromFile) return fromFile
  throw new Error(
    'DATABASE_URL is not set. Add it in Vercel and in Trigger.dev → Environment variables (Production) for the worker.'
  )
}

function createPrismaClient(): PrismaClient {
  const connectionString = resolveDatabaseUrl()
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 25_000,
    idleTimeoutMillis: 30_000,
  })
  return new PrismaClient({
    adapter: new PrismaPg(pool),
  })
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

/**
 * Lazy Prisma proxy: the real client is created on first access, not at module load.
 * Trigger.dev workers often have DATABASE_URL injected only at task runtime; eager
 * `new PrismaClient()` at import used to run with `undefined` and break every query.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient()
    const value = Reflect.get(client, prop, client) as unknown
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client)
    }
    return value
  },
}) as PrismaClient
