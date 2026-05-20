import { Box } from '@mantine/core'
import { useCallback, useRef, useState } from 'react'

const MIN_WIDTH = 200
const MAX_WIDTH = 480

interface SidebarResizeHandleProps {
  width: number
  onWidthChange: (width: number) => void
  onWidthCommit: (width: number) => void
}

export default function SidebarResizeHandle({
  width,
  onWidthChange,
  onWidthCommit
}: SidebarResizeHandleProps): JSX.Element {
  const startRef = useRef({ x: 0, width })
  const [dragging, setDragging] = useState(false)

  const onMouseDown = useCallback(
    (event: React.MouseEvent): void => {
      event.preventDefault()
      setDragging(true)
      startRef.current = { x: event.clientX, width }

      const onMouseMove = (moveEvent: MouseEvent): void => {
        const delta = moveEvent.clientX - startRef.current.x
        const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startRef.current.width + delta))
        onWidthChange(next)
      }

      const onMouseUp = (upEvent: MouseEvent): void => {
        setDragging(false)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        const delta = upEvent.clientX - startRef.current.x
        const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startRef.current.width + delta))
        onWidthCommit(next)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [onWidthChange, onWidthCommit]
  )

  return (
    <Box
      className={`mv-sidebar-resize-handle${dragging ? ' mv-sidebar-resize-handle--active' : ''}`}
      onMouseDown={onMouseDown}
      title="Drag to resize sidebar"
      aria-label="Resize sidebar"
    />
  )
}
