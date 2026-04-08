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

const databaseUrl = getEnvFromFile('DATABASE_URL') ?? process.env.DATABASE_URL

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(
      new Pool({
        connectionString: databaseUrl,
      })
    ),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
