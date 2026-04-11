import type Ffmpeg from 'fluent-ffmpeg'

let configured = false

/**
 * Call once per task run before using fluent-ffmpeg. Avoids resolving ffmpeg/ffprobe
 * binaries at module load time (Trigger.dev indexes tasks by importing modules).
 */
export async function configureFfmpegForTasks(ffmpegApi: typeof Ffmpeg): Promise<void> {
  if (configured) return

  const envFf = process.env.FFMPEG_PATH
  const envFp = process.env.FFPROBE_PATH
  if (envFf && envFp) {
    ffmpegApi.setFfmpegPath(envFf)
    ffmpegApi.setFfprobePath(envFp)
    configured = true
    return
  }

  const [{ default: ffmpegInstaller }, { default: ffprobeInstaller }] = await Promise.all([
    import('@ffmpeg-installer/ffmpeg'),
    import('@ffprobe-installer/ffprobe'),
  ])
  ffmpegApi.setFfmpegPath(ffmpegInstaller.path)
  ffmpegApi.setFfprobePath(ffprobeInstaller.path)
  configured = true
}
