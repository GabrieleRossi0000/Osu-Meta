import { useCallback } from 'react'
import type { CSSProperties } from 'react'
import {
  WINDOWS_RESIZE_HANDLE_SIZE,
  type WindowsResizeEdge
} from '@shared/window-chrome'

const noDragStyle = { WebkitAppRegion: 'no-drag' } as CSSProperties
const handleSize = WINDOWS_RESIZE_HANDLE_SIZE

const edges: Array<{
  edge: WindowsResizeEdge
  style: CSSProperties
  cursor: CSSProperties['cursor']
}> = [
  {
    edge: 'top-left',
    style: { top: 0, left: 0, width: handleSize, height: handleSize },
    cursor: 'nwse-resize'
  },
  {
    edge: 'top',
    style: {
      top: 0,
      left: handleSize,
      right: handleSize,
      height: handleSize
    },
    cursor: 'ns-resize'
  },
  {
    edge: 'top-right',
    style: { top: 0, right: 0, width: handleSize, height: handleSize },
    cursor: 'nesw-resize'
  },
  {
    edge: 'left',
    style: {
      top: handleSize,
      left: 0,
      bottom: handleSize,
      width: handleSize
    },
    cursor: 'ew-resize'
  },
  {
    edge: 'right',
    style: {
      top: handleSize,
      right: 0,
      bottom: handleSize,
      width: handleSize
    },
    cursor: 'ew-resize'
  },
  {
    edge: 'bottom-left',
    style: { bottom: 0, left: 0, width: handleSize, height: handleSize },
    cursor: 'nesw-resize'
  },
  {
    edge: 'bottom',
    style: {
      bottom: 0,
      left: handleSize,
      right: handleSize,
      height: handleSize
    },
    cursor: 'ns-resize'
  },
  {
    edge: 'bottom-right',
    style: { bottom: 0, right: 0, width: handleSize, height: handleSize },
    cursor: 'nwse-resize'
  }
]

export default function WindowResizeHandles(): JSX.Element | null {
  const usesNativeWindowControls = window.api.usesNativeWindowControls

  const onMouseDown = useCallback((edge: WindowsResizeEdge) => {
    return (event: React.MouseEvent): void => {
      event.preventDefault()
      window.api.window.startResize(edge)

      const onMouseUp = (): void => {
        window.api.window.endResize()
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mouseup', onMouseUp)
    }
  }, [])

  if (!usesNativeWindowControls) return null

  return (
    <>
      {edges.map(({ edge, style, cursor }) => (
        <div
          key={edge}
          aria-hidden
          onMouseDown={onMouseDown(edge)}
          style={{
            ...noDragStyle,
            position: 'fixed',
            zIndex: 3000,
            cursor,
            ...style
          }}
        />
      ))}
    </>
  )
}
