export const api = {
  // Workflows
  saveWorkflow: async (data: any) => {
    const res = await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  loadWorkflow: async (id: string) => {
    const res = await fetch(`/api/workflows/${id}`)
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  listWorkflows: async () => {
    const res = await fetch('/api/workflows')
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  // Execution
  runNodes: async (payload: any) => {
    const res = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  getRunStatus: async (runId: string) => {
    const res = await fetch(`/api/runs/${runId}`)
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  // History
  getHistory: async (workflowId?: string) => {
    const url = workflowId ? `/api/history?workflowId=${workflowId}` : '/api/history'
    const res = await fetch(url)
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  // Upload (Transloadit)
  uploadFile: async (file: File): Promise<string> => {
    const getResultUrl = (assembly: any): string | null => {
      const firstResult = Object.values(assembly?.results ?? {})[0] as any
      return firstResult?.[0]?.ssl_url ?? null
    }

    // Get signed params
    const signRes = await fetch('/api/upload/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileType: file.type.startsWith('image') ? 'image' : 'video' }),
    })
    if (!signRes.ok) throw new Error(await signRes.text())
    const { params, signature } = await signRes.json()
    if (!params || !signature) throw new Error('Upload signing failed')

    // Use Transloadit manual form upload
    const formData = new FormData()
    formData.append('params', params)
    formData.append('signature', signature)
    formData.append('file', file)

    const res = await fetch('https://api2.transloadit.com/assemblies', {
      method: 'POST',
      body: formData,
    })
    const assembly = await res.json().catch(() => ({} as any))
    if (!res.ok) {
      const message =
        typeof assembly?.error === 'string'
          ? assembly.error
          : typeof assembly?.message === 'string'
            ? assembly.message
            : JSON.stringify(assembly)
      throw new Error(message)
    }

    const immediateUrl = getResultUrl(assembly)
    if (immediateUrl) return immediateUrl

    const statusUrl = assembly?.assembly_ssl_url ?? assembly?.assembly_url
    if (!statusUrl) throw new Error('Upload failed: missing assembly status URL')

    // Poll until template results are available.
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const statusRes = await fetch(statusUrl)
      const status = await statusRes.json().catch(() => ({} as any))
      const resolvedUrl = getResultUrl(status)
      if (resolvedUrl) return resolvedUrl
      if (status?.ok === 'ASSEMBLY_EXECUTION_FAILED') {
        throw new Error('Upload processing failed in Transloadit')
      }
    }

    throw new Error('Upload processing timed out')
  }
}
