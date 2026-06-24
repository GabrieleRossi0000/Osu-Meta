import { BrowserWindow, ipcMain, screen } from 'electron'
import type { WindowsResizeEdge } from '../shared/window-chrome'

interface ResizeSession {
  win: BrowserWindow
  edge: WindowsResizeEdge
  startBounds: Electron.Rectangle
  startCursor: { x: number; y: number }
}

let session: ResizeSession | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

function stopResizeSession(): void {
  session = null
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function applyResize(active: ResizeSession): void {
  const { win, edge, startBounds, startCursor } = active
  const cursor = screen.getCursorScreenPoint()
  const deltaX = cursor.x - startCursor.x
  const deltaY = cursor.y - startCursor.y

  let { x, y, width, height } = startBounds

  if (edge.includes('right')) width = startBounds.width + deltaX
  if (edge.includes('left')) {
    width = startBounds.width - deltaX
    x = startBounds.x + deltaX
  }
  if (edge.includes('bottom')) height = startBounds.height + deltaY
  if (edge.includes('top')) {
    height = startBounds.height - deltaY
    y = startBounds.y + deltaY
  }

  const [minWidth, minHeight] = win.getMinimumSize()
  if (minWidth > 0 && width < minWidth) {
    if (edge.includes('left')) x = startBounds.x + startBounds.width - minWidth
    width = minWidth
  }
  if (minHeight > 0 && height < minHeight) {
    if (edge.includes('top')) y = startBounds.y + startBounds.height - minHeight
    height = minHeight
  }

  win.setBounds({
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height)
  })
}

export function registerWindowsWindowResizeHandlers(): void {
  if (process.platform !== 'win32') return

  ipcMain.on('window-resize-start', (event, edge: WindowsResizeEdge) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || session) return

    if (win.isMaximized()) {
      win.unmaximize()
    }

    session = {
      win,
      edge,
      startBounds: win.getBounds(),
      startCursor: screen.getCursorScreenPoint()
    }

    pollTimer = setInterval(() => {
      if (!session) return
      applyResize(session)
    }, 16)
  })

  ipcMain.on('window-resize-end', () => {
    stopResizeSession()
  })
}
