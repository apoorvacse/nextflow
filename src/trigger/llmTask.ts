import { task } from '@trigger.dev/sdk/v3'
import { GoogleGenerativeAI, Part } from '@google/generative-ai'

interface LLMPayload {
  nodeId: string
  model: string
  systemPrompt: string
  userMessage: string
  imageUrls: string[]
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: any }

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

function normalizeOpenRouterModel(model: string): string {
  const raw = String(model ?? '').trim()
  if (!raw) return process.env.OPENROUTER_DEFAULT_MODEL || 'openrouter/free'

  // If user picked a human Gemini label, use OpenRouter free router by default
  const lower = raw.toLowerCase()
  if (lower.startsWith('gemini') || lower.startsWith('gemini-')) {
    return process.env.OPENROUTER_DEFAULT_MODEL || 'openrouter/free'
  }

  return raw
}

async function runWithOpenRouter(payload: LLMPayload): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')

  const preferredModel = normalizeOpenRouterModel(payload.model)
  // If images are provided, prefer OpenRouter's automatic router first (it will pick a compatible model).
  // This avoids repeated 404/400 errors when a specific free model is temporarily unavailable or non-vision.
  const modelFallbacks = [
    ...(payload.imageUrls?.length ? ['openrouter/auto'] : []),
    preferredModel,
    process.env.OPENROUTER_DEFAULT_MODEL,
    'openrouter/free',
    'meta-llama/llama-3.2-3b-instruct:free',
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx) as string[]

  const userContent: any[] = []
  if (payload.userMessage) userContent.push({ type: 'text', text: payload.userMessage })
  for (const url of payload.imageUrls ?? []) {
    // OpenRouter is OpenAI-compatible: image_url content parts for vision-capable models
    userContent.push({ type: 'image_url', image_url: { url } })
  }

  const messages: ChatMessage[] = []
  if (payload.systemPrompt) messages.push({ role: 'system', content: payload.systemPrompt })
  messages.push({ role: 'user', content: userContent.length ? userContent : payload.userMessage })

  const call = async (model: string) => {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Recommended by OpenRouter for analytics/rate limiting attribution
        'X-Title': 'nextflow',
        // Also recommended by OpenRouter; some providers enforce it.
        ...(process.env.OPENROUTER_HTTP_REFERER ? { 'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER } : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    })
    const data = await res.json().catch(() => ({} as any))
    return { res, data }
  }

  let lastError: unknown

  for (const model of modelFallbacks) {
    // Retry a few times on 429/provider overload
    for (let attempt = 0; attempt < 3; attempt++) {
      const { res, data } = await call(model)

      if (res.ok) {
        const text = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.delta?.content
        if (!text) throw new Error('OpenRouter: empty response')
        return String(text)
      }

      const msg =
        data?.error?.message ??
        data?.error ??
        data?.message ??
        JSON.stringify(data)

      // If rate limited / provider overloaded, backoff and retry
      const is429 = res.status === 429 || String(msg).toLowerCase().includes('rate limit')
      if (is429 && attempt < 2) {
        const backoffMs = 500 * Math.pow(2, attempt) + Math.floor(Math.random() * 250)
        await new Promise((r) => setTimeout(r, backoffMs))
        continue
      }

      // If a model is missing/unavailable, fall through to the next fallback model.
      const isModelNotFound =
        res.status === 404 ||
        String(msg).toLowerCase().includes('model') && String(msg).toLowerCase().includes('not found')
      if (isModelNotFound) {
        lastError = new Error(`OpenRouter error (${res.status}) [${model}]: ${msg}`)
        break
      }

      lastError = new Error(`OpenRouter error (${res.status}) [${model}]: ${msg}`)
      break
    }
  }

  throw lastError ?? new Error('OpenRouter: all fallbacks failed')
}

export const llmTask = task({
  id: 'llm-node',
  retry: { maxAttempts: 2, minTimeoutInMs: 1000 },
  run: async (payload: LLMPayload) => {
    const { model, systemPrompt, userMessage, imageUrls } = payload

    // Prefer OpenRouter if configured (avoids Gemini quota limits)
    if (process.env.OPENROUTER_API_KEY) {
      const response = await runWithOpenRouter(payload)
      return { response }
    }

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
