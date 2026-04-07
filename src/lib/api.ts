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
    // Get signed params
    const { params, signature } = await fetch('/api/upload/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileType: file.type.startsWith('image') ? 'image' : 'video' }),
    }).then(r => r.json())

    // Use Transloadit manual form upload
    const formData = new FormData()
    formData.append('params', params)
    formData.append('signature', signature)
    formData.append('file', file)

    const res = await fetch('https://api2.transloadit.com/assemblies', {
      method: 'POST',
      body: formData,
    })
    const assembly = await res.json()
    const url = (Object.values(assembly.results ?? {})[0] as any)?.[0]?.ssl_url
    if (!url) throw new Error('Upload failed')
    return url
  }
}
