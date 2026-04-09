import { task } from '@trigger.dev/sdk/v3'
import { GoogleGenerativeAI, Part } from '@google/generative-ai'

interface LLMPayload {
  nodeId: string
  model: string
  systemPrompt: string
  userMessage: string
  imageUrls: string[]
}

function normalizeGeminiModel(model: string): string {
  const raw = String(model ?? '').trim()
  const lower = raw.toLowerCase()

  // Already looks like an SDK model id
  if (lower.startsWith('gemini-')) return lower
  if (lower.startsWith('models/')) return lower.replace(/^models\//, '')

  // UI labels -> API ids
  if (lower.includes('2.0') && lower.includes('flash') && lower.includes('thinking')) {
    return 'gemini-2.0-flash-thinking-exp-1219'
  }
  if (lower.includes('2.0') && lower.includes('flash')) {
    return 'gemini-2.0-flash'
  }
  if (lower.includes('1.5') && lower.includes('pro')) {
    return 'gemini-1.5-pro'
  }
  if (lower.includes('1.5') && lower.includes('flash') && (lower.includes('8b') || lower.includes('flash-8b'))) {
    return 'gemini-1.5-flash-8b'
  }
  if (lower.includes('1.5') && lower.includes('flash')) {
    return 'gemini-1.5-flash'
  }

  // Last resort: try basic slugging (Gemini 2.0 Flash -> gemini-2.0-flash)
  return lower
    .replace(/\./g, '-') // keep formatting stable
    .replace(/\s+/g, '-')
    .replace(/-+$/g, '')
}

export const llmTask = task({
  id: 'llm-node',
  retry: { maxAttempts: 2, minTimeoutInMs: 1000 },
  run: async (payload: LLMPayload) => {
    const { model, systemPrompt, userMessage, imageUrls } = payload

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
    const primaryModelId = normalizeGeminiModel(model)
    const fallbackModels = [
      primaryModelId,
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx)

    const parts: Part[] = []

    for (const imageUrl of imageUrls) {
      try {
        const response = await fetch(imageUrl)
        const buffer = await response.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const mimeType = response.headers.get('content-type') ?? 'image/jpeg'

        parts.push({
          inlineData: {
            data: base64,
            mimeType: mimeType,
          }
        })
      } catch (err) {
        console.warn(`Failed to load image ${imageUrl}:`, err)
      }
    }

    parts.push({ text: userMessage })

    let response = ''
    let lastError: unknown

    for (const modelId of fallbackModels) {
      try {
        const geminiModel = genAI.getGenerativeModel({
          model: modelId,
          ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
        })
        const result = await geminiModel.generateContent({ contents: [{ role: 'user', parts }] })
        response = result.response.text()
        break
      } catch (err: any) {
        lastError = err
        const msg = String(err?.message ?? '')
        const isModelNotFound =
          msg.includes('404 Not Found') ||
          msg.includes('not found for API version') ||
          msg.includes('not supported for generateContent')
        if (!isModelNotFound) throw err
      }
    }

    if (!response) throw lastError ?? new Error('No compatible Gemini model available')

    return { response }
  }
})
