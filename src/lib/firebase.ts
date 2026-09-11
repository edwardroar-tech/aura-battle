import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: 'AIzaSyCNlwur7gY1PKSZClhIye7ti8ZR2KC8EDQ',
  authDomain: 'aura-battle-3ced4.firebaseapp.com',
  projectId: 'aura-battle-3ced4',
  storageBucket: 'aura-battle-3ced4.firebasestorage.app',
  messagingSenderId: '531143198131',
  appId: '1:531143198131:web:228f30c2f8f8e6ea6db7c6',
  measurementId: 'G-MV25F2ZDZT'
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
let messagingPromise: Promise<Messaging | null> | null = null
export function getMessagingInstance() {
  if (!messagingPromise) messagingPromise = isSupported().then(ok => ok ? getMessaging(app) : null)
  return messagingPromise.then(m => { if (!m) throw new Error('fcm-not-supported'); return m })
}
