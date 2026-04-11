import { task } from '@trigger.dev/sdk/v3'
import ffmpeg from 'fluent-ffmpeg'
import { promises as fs } from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as crypto from 'crypto'
import { uploadToTransloadit } from '@/lib/transloadit'
import { configureFfmpegForTasks } from './ffmpegRuntime'

interface CropPayload {
  imageUrl: string
  xPercent: number
  yPercent: number
  widthPercent: number
  heightPercent: number
}

export const cropImageTask = task({
  id: 'crop-image',
  retry: { maxAttempts: 2 },
  run: async (payload: CropPayload) => {
    await configureFfmpegForTasks(ffmpeg)
    const { imageUrl, xPercent, yPercent, widthPercent, heightPercent } = payload
    if (!imageUrl) throw new Error('Missing imageUrl input')

    const response = await fetch(imageUrl)
    if (!response.ok) throw new Error(`Failed to download image: ${response.statusText}`)
    const buffer = await response.arrayBuffer()

    const tmpDir = os.tmpdir()
    const inputId = crypto.randomBytes(8).toString('hex')
    const parsedUrl = new URL(imageUrl)
    const extFromPath = path.extname(parsedUrl.pathname).replace('.', '').toLowerCase()
    const ext = /^[a-z0-9]{2,5}$/.test(extFromPath) ? extFromPath : 'jpg'
    const inputPath = path.join(tmpDir, `crop-input-${inputId}.${ext}`)
    const outputPath = path.join(tmpDir, `crop-output-${inputId}.jpg`)

    await fs.writeFile(inputPath, Buffer.from(buffer))

    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err: Error | null, metadata: ffmpeg.FfprobeData) => {
        if (err) reject(err)
        const stream = metadata?.streams?.find((s: ffmpeg.FfprobeStream) =>
          s.codec_type === 'video' || s.codec_type === 'image'
        )
        resolve({ width: stream?.width ?? 1000, height: stream?.height ?? 1000 })
      })
    })

    const cropX = Math.round((xPercent / 100) * dimensions.width)
    const cropY = Math.round((yPercent / 100) * dimensions.height)
    const cropW = Math.round((widthPercent / 100) * dimensions.width)
    const cropH = Math.round((heightPercent / 100) * dimensions.height)

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilter(`crop=${cropW}:${cropH}:${cropX}:${cropY}`)
        .frames(1)
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run()
    })

    const croppedUrl = await uploadToTransloadit(outputPath, 'image')

    await fs.unlink(inputPath).catch(() => {})
    await fs.unlink(outputPath).catch(() => {})

    return { croppedUrl }
  }
})
