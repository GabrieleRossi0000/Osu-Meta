/** Shared Mantine Modal class names for blurred overlay + elevated content */
export const modalClassNames = {
  inner: 'mv-modal-inner',
  overlay: 'mv-modal-overlay',
  content: 'mv-modal-content',
  header: 'mv-modal-header',
  title: 'mv-modal-title',
  body: 'mv-modal-body'
} as const

export const modalOverlayProps = {
  backgroundOpacity: 0.35,
  blur: 14
} as const

export const modalTransitionProps = {
  transition: 'pop',
  duration: 280,
  timingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
} as const
