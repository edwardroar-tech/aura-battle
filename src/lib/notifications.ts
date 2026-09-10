import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging'
import { arrayUnion, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'

const DEFAULT_VAPID_KEY = 'BOc3DunZYYnDFUHYFWz5TS7rq56QFJaUy06nzJXKYHdnxIugkyUGeXMe7XPIc1ZlmfRxaaXSfdfS15M6iLNQu2M'
const VAPID_KEY = (import.meta.env.VITE_FIREBASE_VAPID_KEY || DEFAULT_VAPID_KEY).trim()

export async function setupPushNotifications(uid:string, onForeground?: (payload:MessagePayload)=>void){
  if(typeof window==='undefined' || !('Notification' in window) || !('serviceWorker' in navigator)){
    return {ok:false, reason:'unsupported'} as const
  }
  try{
    const supported=await isSupported()
    if(!supported) return {ok:false, reason:'unsupported'} as const

    const permission=Notification.permission==='granted' ? 'granted' : await Notification.requestPermission()
    if(permission!=='granted') return {ok:false, reason:'permission-denied'} as const

    const registration=await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const messaging=getMessaging()
    const token=await getToken(messaging, VAPID_KEY ? {vapidKey:VAPID_KEY,serviceWorkerRegistration:registration} : {serviceWorkerRegistration:registration})
    if(!token) return {ok:false, reason:'no-token'} as const

    await updateDoc(doc(db,'users',uid),{fcmTokens:arrayUnion(token)})

    const unsubscribe=onMessage(messaging,payload=>onForeground?.(payload))
    return {ok:true, token, unsubscribe} as const
  }catch(error:any){
    console.error('FCM setup error:',error)
    return {ok:false, reason:error?.code||'error', error} as const
  }
}
