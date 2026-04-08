import { promises as fs } from 'fs'
import * as path from 'path'

export async function uploadToTransloadit(filePath: string, type: 'image' | 'video'): Promise<string> {
  const transloaditMod = await import('transloadit')
  const Transloadit =
    ('default' in transloaditMod ? (transloaditMod as any).default : transloaditMod) as any
  const client = new Transloadit({
    authKey: process.env.TRANSLOADIT_KEY!,
    authSecret: process.env.TRANSLOADIT_SECRET!,
  })

  const fileBuffer = await fs.readFile(filePath)
  const fileName = path.basename(filePath)

  const assembly = await client.createAssembly({
    params: {
      template_id: type === 'image'
        ? process.env.TRANSLOADIT_TEMPLATE_ID_IMAGE
        : process.env.TRANSLOADIT_TEMPLATE_ID_VIDEO,
    },
    files: { file: { name: fileName, data: fileBuffer } },
    waitForCompletion: true,
  })

  const results = assembly.results as Record<string, Array<{ ssl_url?: string }>> | undefined
  const result = results ? Object.values(results)[0]?.[0] : undefined
  if (!result?.ssl_url) throw new Error('Transloadit upload failed')
  return result.ssl_url
}
