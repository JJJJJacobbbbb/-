import { useEffect, useState, useRef } from 'react'

interface ImageViewerProps {
  content: ArrayBuffer
}

export default function ImageViewer({ content }: ImageViewerProps) {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [scale, setScale] = useState(1)
  const prevUrlRef = useRef<string>('')

  useEffect(() => {
    const blob = new Blob([content])
    const url = URL.createObjectURL(blob)
    setImageUrl(url)

    // 延迟撤销上一张 URL，确保新 URL 已被 React 渲染
    const prev = prevUrlRef.current
    prevUrlRef.current = url
    if (prev) {
      // 使用微任务确保 React 已完成本轮渲染
      queueMicrotask(() => URL.revokeObjectURL(prev))
    }

    return () => {
      // 组件卸载时清理当前 URL
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current)
        prevUrlRef.current = ''
      }
    }
  }, [content])

  if (!imageUrl) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-10 bg-gray-50 border-b border-gray-200 flex items-center justify-end px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(Math.max(0.25, scale - 0.25))}
            className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded"
          >
            缩小
          </button>
          <span className="text-sm text-gray-600">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(Math.min(5, scale + 0.25))}
            className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded"
          >
            放大
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-100">
        <img
          src={imageUrl}
          alt="Document"
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
          className="max-w-full h-auto"
        />
      </div>
    </div>
  )
}
