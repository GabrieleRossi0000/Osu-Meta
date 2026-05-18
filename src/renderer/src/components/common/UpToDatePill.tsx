import { Text } from '@mantine/core'
import { IconCircleCheck } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'

const VISIBLE_MS = 2800

export default function UpToDatePill(): JSX.Element | null {
  const [show, setShow] = useState(false)
  const hideTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const unsubscribe = window.api.onUpdaterUpToDate(() => {
      if (hideTimerRef.current != null) {
        window.clearTimeout(hideTimerRef.current)
      }
      setShow(true)
      hideTimerRef.current = window.setTimeout(() => {
        setShow(false)
        hideTimerRef.current = null
      }, VISIBLE_MS)
    })

    return () => {
      unsubscribe()
      if (hideTimerRef.current != null) {
        window.clearTimeout(hideTimerRef.current)
      }
    }
  }, [])

  if (!show) return null

  return (
    <div className="mv-up-to-date-pill" role="status" aria-live="polite">
      <IconCircleCheck size={16} stroke={2} aria-hidden />
      <Text size="sm" fw={600} component="span">
        Up to date
      </Text>
    </div>
  )
}
