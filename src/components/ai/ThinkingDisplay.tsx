import { useRef, useEffect, useState } from 'react'

interface ThinkingDisplayProps {
  text: string
  isStreaming: boolean
  statusText?: string
}

const MAX_VISIBLE_LINES = 6

export default function ThinkingDisplay({ text, isStreaming, statusText }: ThinkingDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)

  // 思考结束时自动收起
  useEffect(() => {
    if (!isStreaming && text) {
      const t = setTimeout(() => setCollapsed(true), 800)
      return () => clearTimeout(t)
    }
    if (isStreaming) {
      setCollapsed(false)
    }
  }, [isStreaming, text])

  // 流式时自动滚动到底部
  useEffect(() => {
    if (isStreaming && !collapsed && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [text, isStreaming, collapsed])

  if (!text && !statusText) return null

  // 只显示最后几行
  const lines = text.split('\n')
  const visibleLines = lines.slice(-MAX_VISIBLE_LINES)
  const hiddenCount = lines.length - visibleLines.length

  return (
    <div className="mb-2">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 text-xs text-purple-500 hover:text-purple-600 select-none"
      >
        <svg
          className={`w-3 h-3 transition-transform ${collapsed ? '' : 'rotate-90'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {isStreaming ? '思考中...' : '思考过程'}
        {!collapsed && lines.length > MAX_VISIBLE_LINES && (
          <span className="text-[10px] text-purple-400">（显示最近 {MAX_VISIBLE_LINES} 行）</span>
        )}
      </button>

      {!collapsed && (
        <div
          ref={containerRef}
          className="mt-1 p-2 bg-purple-50 rounded text-xs text-gray-600 font-mono max-h-32 overflow-y-auto"
        >
          {hiddenCount > 0 && (
            <div className="text-purple-300 text-[10px] mb-1">... 已省略 {hiddenCount} 行</div>
          )}
          {visibleLines.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap leading-relaxed">{line || '\u00A0'}</div>
          ))}
          {isStreaming && (
            <span className="inline-block w-1.5 h-3 bg-purple-400 animate-pulse ml-0.5" />
          )}
        </div>
      )}

      {/* 状态提示 */}
      {statusText && isStreaming && !text && (
        <div className="mt-1 flex items-center gap-2 text-xs text-purple-500">
          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
          {statusText}
        </div>
      )}
    </div>
  )
}
