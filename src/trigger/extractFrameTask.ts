import { task } from '@trigger.dev/sdk/v3'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import { promises as fs } from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as crypto from 'crypto'
import { uploadToTransloadit } from '@/lib/transloadit'

ffmpeg.setFfmpegPath(ffmpegPath.path)

interface ExtractFramePayload {
  videoUrl: string
  timestamp: string // "5" for 5 seconds, "50%" for percentage
}

export const extractFrameTask = task({
  id: 'extract-frame',
  retry: { maxAttempts: 2 },
  run: async (payload: ExtractFramePayload) => {
    const { videoUrl, timestamp } = payload

    const response = await fetch(videoUrl)
    if (!response.ok) throw new Error(`Failed to download video: ${response.statusText}`)
    const buffer = await response.arrayBuffer()

    const tmpDir = os.tmpdir()
    const id = crypto.randomBytes(8).toString('hex')
    const ext = videoUrl.split('.').pop()?.split('?')[0] ?? 'mp4'
    const inputPath = path.join(tmpDir, `frame-input-${id}.${ext}`)
    const outputPath = path.join(tmpDir, `frame-output-${id}.jpg`)

    await fs.writeFile(inputPath, Buffer.from(buffer))

    let seekTime: number = 0

    if (timestamp.includes('%')) {
      const pct = parseFloat(timestamp) / 100
      const duration = await new Promise<number>((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err: Error | null, metadata: ffmpeg.FfprobeData) => {
          if (err) reject(err)
          resolve(metadata?.format?.duration ?? 10)
        })
      })
      seekTime = pct * duration
    } else {
      seekTime = parseFloat(timestamp) || 0
    }

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(seekTime)
        .frames(1)
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run()
    })

    const frameUrl = await uploadToTransloadit(outputPath, 'image')

    await fs.unlink(inputPath).catch(() => {})
    await fs.unlink(outputPath).catch(() => {})

    return { frameUrl }
  }
})
