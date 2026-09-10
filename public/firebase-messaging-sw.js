/* Aura farming battles · Firebase Cloud Messaging service worker */
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCNlwur7gY1PKSZClhIye7ti8ZR2KC8EDQ',
  authDomain: 'aura-battle-3ced4.firebaseapp.com',
  projectId: 'aura-battle-3ced4',
  storageBucket: 'aura-battle-3ced4.firebasestorage.app',
  messagingSenderId: '531143198131',
  appId: '1:531143198131:web:228f30c2f8f8e6ea6db7c6',
  measurementId: 'G-MV25F2ZDZT'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || 'Aura farming battles';
  const body = notification.body || data.body || 'Tienes una nueva notificación.';
  const url = data.url || '/';

  self.registration.showNotification(title, {
    body,
    icon: '/assets/aura-icon-192.png',
    badge: '/assets/aura-icon-192.png',
    data: { url }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification?.data?.url || '/';
  event.waitUntil((async()=>{
    const clients = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients){
      if('focus' in client){
        try{ await client.navigate(target); }catch{}
        return client.focus();
      }
    }
    if(self.clients.openWindow) return self.clients.openWindow(target);
  })());
});
