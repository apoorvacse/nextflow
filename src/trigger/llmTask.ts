import { task } from '@trigger.dev/sdk/v3'
import { GoogleGenerativeAI, Part } from '@google/generative-ai'

interface LLMPayload {
  nodeId: string
  model: string
  systemPrompt: string
  userMessage: string
  imageUrls: string[]
}

export const llmTask = task({
  id: 'llm-node',
  retry: { maxAttempts: 2, minTimeoutInMs: 1000 },
  run: async (payload: LLMPayload) => {
    const { model, systemPrompt, userMessage, imageUrls } = payload

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
    const geminiModel = genAI.getGenerativeModel({
      model: model,
      ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
    })

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

    const result = await geminiModel.generateContent({ contents: [{ role: 'user', parts }] })
    const response = result.response.text()

    return { response }
  }
})
