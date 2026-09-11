/* Aura farming battles — Firebase Cloud Messaging service worker */
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyCNlwur7gY1PKSZClhIye7ti8ZR2KC8EDQ',
  authDomain: 'aura-battle-3ced4.firebaseapp.com',
  projectId: 'aura-battle-3ced4',
  storageBucket: 'aura-battle-3ced4.firebasestorage.app',
  messagingSenderId: '531143198131',
  appId: '1:531143198131:web:228f30c2f8f8e6ea6db7c6'
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {}
  const data = payload.data || {}
  const title = notification.title || data.title || 'Aura farming battles'
  const options = {
    body: notification.body || data.body || 'Tienes una nueva notificación.',
    icon: '/assets/aura-arena-home.png',
    badge: '/assets/aura-arena-home.png',
    data: { url: data.url || '/' }
  }
  self.registration.showNotification(title, options)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification?.data?.url || '/'
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clientsList) {
      if ('focus' in client) {
        await client.focus()
        if ('navigate' in client && url) await client.navigate(url)
        return
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url)
  })())
})
