export async function uploadToTransloadit(filePath: string, type: 'image' | 'video'): Promise<string> {
  const transloaditMod = await import('transloadit')
  const TransloaditCtor = (transloaditMod as any).Transloadit
  if (typeof TransloaditCtor !== 'function') {
    throw new Error('Transloadit export missing or not a constructor')
  }

  const client = new TransloaditCtor({
    authKey: process.env.TRANSLOADIT_KEY!,
    authSecret: process.env.TRANSLOADIT_SECRET!,
  })

  const assembly = await client.createAssembly({
    params: {
      template_id: type === 'image'
        ? process.env.TRANSLOADIT_TEMPLATE_ID_IMAGE
        : process.env.TRANSLOADIT_TEMPLATE_ID_VIDEO,
    },
    // The Transloadit Node SDK expects `files` values to be filesystem paths.
    // (Using an in-memory buffer here would be treated as a `path` and crash.)
    files: { file: filePath },
    waitForCompletion: true,
  })

  const extractSslUrl = (assemblyAny: any): string | undefined => {
    const results = assemblyAny?.results as Record<string, Array<{ ssl_url?: string }>> | undefined
    return results ? (Object.values(results)[0]?.[0]?.ssl_url as string | undefined) : undefined
  }

  const immediateUrl = extractSslUrl(assembly)
  if (immediateUrl) return immediateUrl

  // Some templates return without a populated `results` object even after completion.
  // Poll the assembly status URL until the processed output `ssl_url` appears.
  const statusUrl = assembly?.assembly_ssl_url ?? assembly?.assembly_url
  if (!statusUrl) throw new Error('Transloadit upload failed: missing results and status URL')

  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const status = await fetch(statusUrl).then((r) => r.json().catch(() => ({} as any)))
    const url = extractSslUrl(status)
    if (url) return url
    if (status?.ok === 'ASSEMBLY_EXECUTION_FAILED') break
  }

  throw new Error('Transloadit upload failed: output url not found')
}
