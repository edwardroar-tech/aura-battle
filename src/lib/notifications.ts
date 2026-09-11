import { getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging'
import { getMessagingInstance } from './firebase'

export const FIREBASE_VAPID_KEY = 'BOc3DunZYYnDFUHYFWz5TS7rq56QFJaUy06nzJXKYHdnxIugkyUGeXMe7XPIc1ZlmfRxaaXSfdfS15M6iLNQu2M'

export async function enableWebPush(): Promise<{ token: string; permission: NotificationPermission }> {
  if (!('Notification' in window)) throw new Error('notifications-not-supported')
  if (!('serviceWorker' in navigator)) throw new Error('service-worker-not-supported')
  if (!window.isSecureContext) throw new Error('https-required')

  const supported = await isSupported().catch(() => false)
  if (!supported) throw new Error('fcm-not-supported')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error(`notification-permission-${permission}`)

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  const messaging = await getMessagingInstance()
  const token = await getToken(messaging, { vapidKey: FIREBASE_VAPID_KEY, serviceWorkerRegistration: registration })
  if (!token) throw new Error('fcm-token-empty')
  return { token, permission }
}

export async function listenForegroundMessages(handler: (payload: MessagePayload) => void): Promise<() => void> {
  const supported = await isSupported().catch(() => false)
  if (!supported) return () => {}
  const messaging = await getMessagingInstance()
  return onMessage(messaging, handler)
}
