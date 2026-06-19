import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { MIN_SELECTION_SIZE } from '../lib/constants'
import '../index.css'

function ScreenshotSelector() {
  const [isSelecting, setIsSelecting] = React.useState(false)
  const [startPos, setStartPos] = React.useState({ x: 0, y: 0 })
  const [endPos, setEndPos] = React.useState({ x: 0, y: 0 })

  // ESC 键取消截图
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.desktopHost?.invoke('screenshot:cancel')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // 只响应左键
    setIsSelecting(true)
    setStartPos({ x: e.clientX, y: e.clientY })
    setEndPos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isSelecting) {
      setEndPos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button !== 0) return // 只响应左键
    if (isSelecting) {
      const bounds = {
        x: Math.min(startPos.x, endPos.x),
        y: Math.min(startPos.y, endPos.y),
        width: Math.abs(endPos.x - startPos.x),
        height: Math.abs(endPos.y - startPos.y),
      }
      if (bounds.width < MIN_SELECTION_SIZE || bounds.height < MIN_SELECTION_SIZE) {
        // 选区太小，忽略
        setIsSelecting(false)
        return
      }
      window.desktopHost?.invoke('screenshot:complete', bounds)
      setIsSelecting(false)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isSelecting) {
      setIsSelecting(false)
    } else {
      window.desktopHost?.invoke('screenshot:cancel')
    }
  }

  return (
    <div
      className="w-full h-screen cursor-crosshair screenshot-overlay"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      {/* 提示文字 */}
      {!isSelecting && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
          拖拽选择区域 · 右键或 ESC 取消
        </div>
      )}
      {isSelecting && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/20"
          style={{
            left: Math.min(startPos.x, endPos.x),
            top: Math.min(startPos.y, endPos.y),
            width: Math.abs(endPos.x - startPos.x),
            height: Math.abs(endPos.y - startPos.y),
          }}
        />
      )}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ScreenshotSelector />
  </React.StrictMode>
)
