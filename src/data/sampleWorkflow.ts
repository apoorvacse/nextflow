import { Node, Edge } from '@xyflow/react'

export const sampleNodes: Node[] = [
  { id: '1', type: 'uploadImageNode', position: { x: 80, y: 100 }, data: { label: 'Upload Image' } },
  { id: '2', type: 'cropImageNode', position: { x: 420, y: 100 }, data: { label: 'Crop Image', width_percent: 100, height_percent: 100 } },
  { id: '3', type: 'textNode', position: { x: 420, y: 320 }, data: { label: 'System Prompt A', text: 'You are a professional marketing copywriter. Generate a compelling one-paragraph product description.' } },
  { id: '4', type: 'textNode', position: { x: 420, y: 520 }, data: { label: 'Product Details', text: 'Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.' } },
  { id: '5', type: 'llmNode', position: { x: 780, y: 280 }, data: { label: 'Run LLM 1', model: 'Gemini 2.0 Flash' } },
  { id: '6', type: 'uploadVideoNode', position: { x: 80, y: 620 }, data: { label: 'Upload Video' } },
  { id: '7', type: 'extractFrameNode', position: { x: 420, y: 700 }, data: { label: 'Extract Frame', timestamp: '50%' } },
  { id: '8', type: 'textNode', position: { x: 1100, y: 100 }, data: { label: 'System Prompt B', text: 'You are a social media manager. Create a tweet-length marketing post based on the product image and video frame.' } },
  { id: '9', type: 'llmNode', position: { x: 1400, y: 400 }, data: { label: 'Run LLM 2', model: 'Gemini 2.0 Flash' } },
]

export const sampleEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', sourceHandle: 'output', targetHandle: 'image_url', animated: true, type: 'smoothstep' },
  { id: 'e3-5', source: '3', target: '5', sourceHandle: 'output', targetHandle: 'system_prompt', animated: true, type: 'smoothstep' },
  { id: 'e4-5', source: '4', target: '5', sourceHandle: 'output', targetHandle: 'user_message', animated: true, type: 'smoothstep' },
  { id: 'e2-5', source: '2', target: '5', sourceHandle: 'output', targetHandle: 'images', animated: true, type: 'smoothstep' },
  { id: 'e6-7', source: '6', target: '7', sourceHandle: 'output', targetHandle: 'video_url', animated: true, type: 'smoothstep' },
  { id: 'e8-9', source: '8', target: '9', sourceHandle: 'output', targetHandle: 'system_prompt', animated: true, type: 'smoothstep' },
  { id: 'e5-9', source: '5', target: '9', sourceHandle: 'output', targetHandle: 'user_message', animated: true, type: 'smoothstep' },
  { id: 'e2-9', source: '2', target: '9', sourceHandle: 'output', targetHandle: 'images', animated: true, type: 'smoothstep' },
  { id: 'e7-9', source: '7', target: '9', sourceHandle: 'output', targetHandle: 'images', animated: true, type: 'smoothstep' },
]
