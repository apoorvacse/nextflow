declare module 'fluent-ffmpeg' {
  const ffmpeg: any

  namespace ffmpeg {
    export interface FfprobeStream {
      codec_type?: string
      width?: number
      height?: number
    }

    export interface FfprobeData {
      streams?: FfprobeStream[]
      format?: {
        duration?: number
      }
    }
  }

  export default ffmpeg
}

