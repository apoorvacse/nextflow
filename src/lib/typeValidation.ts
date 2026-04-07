import { HandleType } from '@/types/workflow'

export const isValidConnection = (sourceHandleType: HandleType | string, targetHandleId: string): boolean => {
  // Mapping rules based on handle ID name which dictates the required type
  // Connection validation logic based on Krea.ai workflow rules
  if (sourceHandleType === 'text') {
    return ['system_prompt', 'user_message', 'x_percent', 'y_percent', 'width_percent', 'height_percent', 'timestamp'].includes(targetHandleId)
  }
  
  if (sourceHandleType === 'image') {
    return ['images', 'image_url'].includes(targetHandleId)
  }

  if (sourceHandleType === 'video') {
    return ['video_url'].includes(targetHandleId)
  }

  return false
}
