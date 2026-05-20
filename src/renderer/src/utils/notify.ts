import { notifications } from '@mantine/notifications'

export function notifySuccess(message: string): void {
  notifications.show({
    message,
    color: 'green',
    position: 'top-center',
    autoClose: 2800,
    withCloseButton: false,
    classNames: {
      root: 'mv-notification mv-notification-enter'
    }
  })
}

export function notifyError(message: string): void {
  notifications.show({
    message,
    color: 'red',
    position: 'top-center',
    autoClose: 4000,
    withCloseButton: true,
    classNames: {
      root: 'mv-notification mv-notification-enter mv-notification--error'
    }
  })
}
