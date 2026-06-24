export const WINDOW_BAR_HEIGHT = 48

/** Windows snap layouts need a smaller minimum than the desktop editor layout. */
export const WINDOWS_MIN_WINDOW_WIDTH = 500

/** Invisible edge hit target for manual resize on Windows (Electron 28 frameless hit-test). */
export const WINDOWS_RESIZE_HANDLE_SIZE = 6

export type WindowsResizeEdge =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export const WINDOWS_TITLE_BAR_OVERLAY = {
  dark: {
    color: '#161D28',
    symbolColor: '#cbedff'
  },
  light: {
    color: '#f8f9fa',
    symbolColor: '#283243'
  }
} as const
