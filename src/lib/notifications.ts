import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging'
import { auth } from './firebase'
import { arrayUnion, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'

const DEFAULT_VAPID_KEY = 'BOc3DunZYYnDFUHYFWz5TS7rq56QFJaUy06nzJXKYHdnxIugkyUGeXMe7XPIc1ZlmfRxaaXSfdfS15M6iLNQu2M'
const VAPID_KEY = (import.meta.env.VITE_FIREBASE_VAPID_KEY || DEFAULT_VAPID_KEY).trim()

export async function setupPushNotifications(uid:string, onForeground?: (payload:MessagePayload)=>void){
  const ua=typeof navigator!=='undefined'?navigator.userAgent:''
  const isAndroidWebView=/Android/i.test(ua)&&(/\bwv\b/i.test(ua)||/;\s*wv\)/i.test(ua)||!/Chrome\//i.test(ua))
  if(isAndroidWebView){
    return {ok:false, reason:'android-webview-native-required'} as const
  }
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


export async function notifyUser(userId:string,title:string,body:string,url='/'){
  try{
    if(!auth.currentUser)return false
    const idToken=await auth.currentUser.getIdToken()
    const response=await fetch('/api/push',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${idToken}`},
      body:JSON.stringify({userId,title,body,url})
    })
    if(!response.ok){
      console.warn('Push delivery failed:',response.status,await response.text())
      return false
    }
    return true
  }catch(error){
    console.warn('Push delivery request failed:',error)
    return false
  }
}
