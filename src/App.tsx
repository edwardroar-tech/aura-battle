import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode, RefObject } from 'react'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import { auth, db } from './lib/firebase'
import { enableWebPush, listenForegroundMessages } from './lib/notifications'
import { socket } from './lib/socket'
import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithRedirect, signInWithPopup, getRedirectResult, GoogleAuthProvider, signOut, updateProfile, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, arrayUnion, arrayRemove, where, writeBatch, increment, runTransaction } from 'firebase/firestore'

type Lang = 'es'|'en'|'pt'|'fr'|'de'|'it'|'tr'|'ja'|'ko'|'zh'
type Tab = 'home'|'profile'|'friends'|'chat'|'battle'|'ai'|'ranking'|'league'|'clans'|'premium'|'settings'

type Friend = {id:string; name:string; aura:number}
type FriendRequest = {id:string; senderId:string; senderName:string; senderAura:number; receiverId:string; createdAt?:any}
type BattleInvite = {id:string; senderId:string; senderName:string; receiverId:string; roomCode:string; status:'pending'|'accepted'|'declined'; createdAt?:any}
type ChatMsg = {id:string; uid:string; name:string; text:string; conversationId?:string; participants?:string[]; createdAt?:any; type?:'message'|'battleInvite'; roomCode?:string; receiverId?:string; status?:'pending'|'accepted'|'declined'}
type Clan = {id:string; name:string; owner:string; members:string[]; tag?:string; description?:string; visibility?:'public'|'private'; coLeader?:string; createdAt?:any}
type ClanJoinRequest = {id:string; clanId:string; requesterId:string; requesterName:string; receiverId?:string; clanName?:string; kind?:'join'|'invite'; status:'pending'|'accepted'|'rejected'; createdAt?:any}
type ClanInvite = {id:string; clanId:string; senderId:string; senderName:string; receiverId:string; clanName?:string; clanTag?:string; kind?:'join'|'invite'; status:'pending'|'accepted'|'declined'|'rejected'; createdAt?:any}
type ClanMember = {id:string; name:string; aura:number}
type ClanChatMsg = {id:string; clanId:string; uid:string; name:string; text:string; createdAt?:any}

declare global {
  interface Window { nsfwjs?: any; }
}


const copy:Record<Lang,Record<string,string>>={
 es:{home:'Inicio',profile:'Perfil',friends:'Amigos',chat:'Chat',battle:'Batallas',ai:'IA Aura',ranking:'Ranking',league:'Liga',clans:'Clanes',premium:'Premium',settings:'Ajustes',welcome:'Prepárate para la batalla',create:'CREAR SALA',join:'UNIRME',code:'CÓDIGO',logout:'Cerrar sesión',login:'Iniciar sesión',register:'Crear cuenta',online:'Jugadores online',play:'JUGAR AHORA'},
 en:{home:'Home',profile:'Profile',friends:'Friends',chat:'Chat',battle:'Battles',ai:'Aura AI',ranking:'Ranking',league:'League',clans:'Clans',premium:'Premium',settings:'Settings',welcome:'Prepare for battle',create:'CREATE ROOM',join:'JOIN',code:'CODE',logout:'Log out',login:'Log in',register:'Create account',online:'Players online',play:'PLAY NOW'},
 pt:{home:'Início',profile:'Perfil',friends:'Amigos',chat:'Chat',battle:'Batalhas',ai:'IA Aura',ranking:'Ranking',league:'Liga',clans:'Clãs',premium:'Premium',settings:'Configurações',welcome:'Prepare-se para a batalha',create:'CRIAR SALA',join:'ENTRAR',code:'CÓDIGO',logout:'Sair',login:'Entrar',register:'Criar conta',online:'Jogadores online',play:'JOGAR AGORA'},
 fr:{home:'Accueil',profile:'Profil',friends:'Amis',chat:'Chat',battle:'Combats',ai:'IA Aura',ranking:'Classement',league:'Ligue',clans:'Clans',premium:'Premium',settings:'Réglages',welcome:'Prépare-toi au combat',create:'CRÉER UNE SALLE',join:'REJOINDRE',code:'CODE',logout:'Déconnexion',login:'Connexion',register:'Créer un compte',online:'Joueurs en ligne',play:'JOUER'},
 de:{home:'Start',profile:'Profil',friends:'Freunde',chat:'Chat',battle:'Kämpfe',ai:'Aura-KI',ranking:'Rangliste',league:'Liga',clans:'Clans',premium:'Premium',settings:'Einstellungen',welcome:'Bereit für den Kampf',create:'RAUM ERSTELLEN',join:'BEITRETEN',code:'CODE',logout:'Abmelden',login:'Anmelden',register:'Konto erstellen',online:'Spieler online',play:'JETZT SPIELEN'},
 it:{home:'Home',profile:'Profilo',friends:'Amici',chat:'Chat',battle:'Battaglie',ai:'IA Aura',ranking:'Classifica',league:'Lega',clans:'Clan',premium:'Premium',settings:'Impostazioni',welcome:'Preparati alla battaglia',create:'CREA STANZA',join:'ENTRA',code:'CODICE',logout:'Esci',login:'Accedi',register:'Crea account',online:'Giocatori online',play:'GIOCA ORA'},
 tr:{home:'Ana Sayfa',profile:'Profil',friends:'Arkadaşlar',chat:'Sohbet',battle:'Savaşlar',ai:'Aura Yapay Zeka',ranking:'Sıralama',league:'Lig',clans:'Klanlar',premium:'Premium',settings:'Ayarlar',welcome:'Savaşa hazırlan',create:'ODA OLUŞTUR',join:'KATIL',code:'KOD',logout:'Çıkış',login:'Giriş',register:'Hesap oluştur',online:'Çevrimiçi',play:'HEMEN OYNA'},
 ja:{home:'ホーム',profile:'プロフィール',friends:'フレンド',chat:'チャット',battle:'バトル',ai:'Aura AI',ranking:'ランキング',league:'リーグ',clans:'クラン',premium:'プレミアム',settings:'設定',welcome:'バトルの準備をしよう',create:'ルーム作成',join:'参加',code:'コード',logout:'ログアウト',login:'ログイン',register:'アカウント作成',online:'オンライン',play:'今すぐプレイ'},
 ko:{home:'홈',profile:'프로필',friends:'친구',chat:'채팅',battle:'배틀',ai:'Aura AI',ranking:'랭킹',league:'리그',clans:'클랜',premium:'프리미엄',settings:'설정',welcome:'배틀을 준비하세요',create:'방 만들기',join:'참가',code:'코드',logout:'로그아웃',login:'로그인',register:'계정 만들기',online:'온라인',play:'지금 플레이'},
 zh:{home:'首页',profile:'资料',friends:'好友',chat:'聊天',battle:'对战',ai:'Aura AI',ranking:'排行榜',league:'联赛',clans:'战队',premium:'高级版',settings:'设置',welcome:'准备战斗',create:'创建房间',join:'加入',code:'代码',logout:'退出',login:'登录',register:'创建账号',online:'在线玩家',play:'立即游戏'}
}
const nav:Tab[]=['home','profile','friends','chat','battle','ai','ranking','league','clans','premium','settings']

export default function App(){
 const [user,setUser]=useState(auth.currentUser); const [authReady,setAuthReady]=useState(false); const [authMode,setAuthMode]=useState<'choice'|'login'|'register'>('choice'); const [lang,setLang]=useState<Lang>('es')
 const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [password2,setPassword2]=useState(''); const [name,setName]=useState(''); const [authMsg,setAuthMsg]=useState(''); const [legalAccepted,setLegalAccepted]=useState(false); const [legalDoc,setLegalDoc]=useState<null|'reglamento'|'terminos'|'privacidad'>(null)
 const [tab,setTab]=useState<Tab>('home'); const [profile,setProfile]=useState({aura:0,wins:0,losses:0,draws:0,battles:0,auraEarned:0,currentStreak:0,bestStreak:0,level:1})
 const [friendSearch,setFriendSearch]=useState(''); const [friends,setFriends]=useState<Friend[]>([]); const [friendResults,setFriendResults]=useState<Friend[]>([]); const [friendMsg,setFriendMsg]=useState(''); const [friendSearching,setFriendSearching]=useState(false); const [friendRequests,setFriendRequests]=useState<FriendRequest[]>([]); const [unreadFriendRequests,setUnreadFriendRequests]=useState<FriendRequest[]>([]); const [battleInvites,setBattleInvites]=useState<BattleInvite[]>([]); const [notificationOpen,setNotificationOpen]=useState(false); const [unreadPrivateMessages,setUnreadPrivateMessages]=useState<ChatMsg[]>([])
 const [chat,setChat]=useState<ChatMsg[]>([]); const [chatInput,setChatInput]=useState(''); const [chatLoading,setChatLoading]=useState(false); const [chatMsg,setChatMsg]=useState(''); const [privateFriend,setPrivateFriend]=useState<Friend|null>(null); const [privateChat,setPrivateChat]=useState<ChatMsg[]>([]); const [privateInput,setPrivateInput]=useState(''); const [privateLoading,setPrivateLoading]=useState(false); const [privateMsg,setPrivateMsg]=useState('')
 const [clanChat,setClanChat]=useState<ClanChatMsg[]>([]); const [clanChatInput,setClanChatInput]=useState(''); const [clanChatLoading,setClanChatLoading]=useState(false); const [clanChatMsg,setClanChatMsg]=useState(''); const [unreadClanChatCount,setUnreadClanChatCount]=useState(0);
 const [firebaseDiag,setFirebaseDiag]=useState(''); const [firebaseDiagBusy,setFirebaseDiagBusy]=useState(false); const [pushStatus,setPushStatus]=useState(''); const [pushBusy,setPushBusy]=useState(false); const pushUnsubRef=useRef<null|(()=>void)>(null); const [leaders,setLeaders]=useState<Friend[]>([]); const [myRank,setMyRank]=useState<number|null>(null); const [publicProfile,setPublicProfile]=useState<Friend|null>(null); const [clans,setClans]=useState<Clan[]>([]); const [unreadClanJoinRequests,setUnreadClanJoinRequests]=useState<ClanJoinRequest[]>([]); const [clanSearch,setClanSearch]=useState(''); const [clanSearchResults,setClanSearchResults]=useState<Clan[]|null>(null); const [clanSearching,setClanSearching]=useState(false); const [clanName,setClanName]=useState(''); const [clanTag,setClanTag]=useState(''); const [clanDescription,setClanDescription]=useState(''); const [clanVisibility,setClanVisibility]=useState<'public'|'private'>('public'); const [myClanId,setMyClanId]=useState<string|null>(null); const [clanMsg,setClanMsg]=useState(''); const [selectedClan,setSelectedClan]=useState<Clan|null>(null); const [clanMembers,setClanMembers]=useState<ClanMember[]>([]); const [clanJoinRequests,setClanJoinRequests]=useState<ClanJoinRequest[]>([]); const [myClanRequests,setMyClanRequests]=useState<ClanJoinRequest[]>([]); const [clanInvitesSent,setClanInvitesSent]=useState<ClanInvite[]>([]); const [unreadClanInvites,setUnreadClanInvites]=useState<ClanInvite[]>([]); const [clanInvitingFriendId,setClanInvitingFriendId]=useState<string|null>(null)
 const [premium,setPremium]=useState(false); const [musicOn,setMusicOn]=useState(true); const [mobileMore,setMobileMore]=useState(false); const [resetSent,setResetSent]=useState(false); const [theme,setTheme]=useState<'neon'|'midnight'>('neon')
 const [poseReady,setPoseReady]=useState(false); const [trainingActive,setTrainingActive]=useState(false); const [trainingSeconds,setTrainingSeconds]=useState(0); const [trainingDone,setTrainingDone]=useState(false); const [safetyReady,setSafetyReady]=useState(false); const [battleReady,setBattleReady]=useState(false); const [opponentReady,setOpponentReady]=useState(false); const [detectedMove,setDetectedMove]=useState('Esperando movimiento…'); const [moveBonus,setMoveBonus]=useState(0); const [room,setRoom]=useState(''); const [roomCode,setRoomCode]=useState(''); const [roomStatus,setRoomStatus]=useState('Listo.'); const [opponentJoined,setOpponentJoined]=useState(false); const [bothCamerasReady,setBothCamerasReady]=useState(false); const [host,setHost]=useState(false); const [cameraOn,setCameraOn]=useState(false); const [battleStarted,setBattleStarted]=useState(false); const [battleSeconds,setBattleSeconds]=useState(0); const [aura,setAura]=useState(0); const [opponentAura,setOpponentAura]=useState(0); const [battleCountdown,setBattleCountdown]=useState(0); const [online,setOnline]=useState(0); const [battleResult,setBattleResult]=useState<{outcome:'win'|'loss'|'draw';localScore:number;rivalScore:number;delta:number}|null>(null)
 const privateChatEndRef=useRef<HTMLDivElement|null>(null); const privateInputRef=useRef<HTMLInputElement|null>(null); const safetyModelRef=useRef<any>(null); const safetyLoadingRef=useRef(false); const safetyScanAtRef=useRef(0); const speechRecognitionRef=useRef<any>(null); const safetyViolationRef=useRef(false); const hostRef=useRef(false); const battleResultHandledRef=useRef(false); const poseHistoryRef=useRef<{x:number;y:number;z:number;visibility:number}[][]>([]); const patternScoreRef=useRef(0); const lastMoveBonusRef=useRef(0); const lastMoveAtRef=useRef(0); const cameraSourceRef=useRef<'ai'|'battle'|null>(null); const videoRef=useRef<HTMLVideoElement>(null); const aiVideoRef=useRef<HTMLVideoElement>(null); const battleMusicRef=useRef<HTMLAudioElement>(null); const remoteVideoRef=useRef<HTMLVideoElement>(null); const localStreamRef=useRef<MediaStream|null>(null); const peerRef=useRef<RTCPeerConnection|null>(null); const pendingIceRef=useRef<RTCIceCandidateInit[]>([]); const canvasRef=useRef<HTMLCanvasElement|null>(null); const poseLandmarkerRef=useRef<PoseLandmarker|null>(null); const poseLoadingRef=useRef(false); const previousPoseRef=useRef<{x:number;y:number;z:number;visibility:number}[]|null>(null); const movementScoreRef=useRef(0); const poseFrameCountRef=useRef(0); const poseVisibleFrameCountRef=useRef(0); const lastPoseTimeRef=useRef(0)
 const t=copy[lang]

 // Mantiene la navegación interna de la app sincronizada con el botón Atrás
 // de Android/navegador: desde cualquier pestaña, Atrás vuelve a Inicio.
 const navigateTab=(next:Tab)=>{
   if(next==='home'){
     window.history.replaceState({auraTab:'home'},'',window.location.href)
     setTab('home')
     return
   }
   window.history.pushState({auraTab:next},'',window.location.href)
   setTab(next)
 }

 // Android/navegador: el botón físico Atrás siempre lleva a Inicio
 // y no permite que la WebView cierre la app desde una pantalla interna.
 useEffect(()=>{
   if(!authReady || !user)return
   const backState={auraBackGuard:true,auraTab:'home'}
   window.history.replaceState(backState,'',window.location.href)
   window.history.pushState(backState,'',window.location.href)
   const handleBack=()=>{
     setNotificationOpen(false)
     setMobileMore(false)
     setTab('home')
     setSelectedClan(null)
     setPrivateFriend(null)
     window.history.pushState(backState,'',window.location.href)
   }
   window.addEventListener('popstate',handleBack)
   return()=>window.removeEventListener('popstate',handleBack)
 },[authReady,user])

 useEffect(()=>{
   let alive=true
   let unsubscribe:undefined|(()=>void)
   const bootAuth=async()=>{
     // Suscribimos primero a Auth: en Android WebView getRedirectResult puede tardar.
     unsubscribe=onAuthStateChanged(auth,async u=>{
       if(!alive)return
       setUser(u);setAuthReady(true);setPrivateFriend(null);setPrivateChat([])
       if(!u){setFriends([]);return}
       setAuthMode('choice');setTab('home');setNotificationOpen(false);setAuthMsg('')
       try{
         const snap=await getDoc(doc(db,'users',u.uid))
         if(snap.exists()){
           const d=snap.data()
           setProfile({aura:Number(d.aura||0),wins:Number(d.victorias||0),losses:Number(d.derrotas||0),draws:Number(d.empates||0),battles:Number(d.batallas||0),auraEarned:Number(d.auraGanada||0),currentStreak:Number(d.rachaActual||0),bestStreak:Number(d.mejorRacha||0),level:Number(d.level||1)})
           const ids=Array.isArray(d.friends)?d.friends:[]
           const profiles=await Promise.all(ids.map(async(id:string)=>{
             try{const fs=await getDoc(doc(db,'users',id));if(!fs.exists())return null;const x=fs.data();return{id,name:String(x.nombre||x.name||x.displayName||'Jugador'),aura:Number(x.aura||0)} as Friend}catch{return null}
           }))
           setFriends(profiles.filter(Boolean) as Friend[])
         }else{
           await setDoc(doc(db,'users',u.uid),{uid:u.uid,nombre:u.displayName||'Jugador',nombreLower:(u.displayName||'Jugador').toLowerCase(),email:u.email||'',aura:0,victorias:0,derrotas:0,empates:0,batallas:0,auraGanada:0,rachaActual:0,mejorRacha:0,level:1,friends:[],createdAt:serverTimestamp()},{merge:true})
           setFriends([])
         }
       }catch(error){console.error('Auth profile bootstrap error:',error)}
     })
     try{await setPersistence(auth,browserLocalPersistence)}catch(error){console.error('Auth persistence error:',error)}
     try{
       const result=await Promise.race([getRedirectResult(auth),new Promise<null>(resolve=>setTimeout(()=>resolve(null),8000))])
       if(alive&&result?.user){setUser(result.user);setAuthMode('choice');setTab('home');setAuthMsg('')}
     }catch(e:any){
       console.error('Auth redirect bootstrap error:',e)
       if(alive&&e?.code)setAuthMsg(e.message?.replace('Firebase: Error (auth/','').replace(').','')||'No se pudo completar el inicio de sesión.')
     }finally{if(alive)setAuthReady(true)}
   }
   void bootAuth()
   return()=>{alive=false;unsubscribe?.()}
 },[])

 useEffect(()=>{
  if(!user){setFriendRequests([]);return}
  const q=query(collection(db,'friendRequests'),where('receiverId','==',user.uid))
  return onSnapshot(q,s=>{
    const rows=s.docs.map(d=>({id:d.id,...d.data()} as FriendRequest)).filter(r=>r.senderId&&r.receiverId===user.uid)
    rows.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))
    setFriendRequests(rows)
    const unread=rows.filter(r=>localStorage.getItem(`auraFriendRequestRead:${user.uid}:${r.id}`)!=='1')
    setUnreadFriendRequests(unread)
  },e=>{
    console.error('Friend requests load error:',e)
    setFriendRequests([]);setUnreadFriendRequests([])
  })
},[user])

 useEffect(()=>{
  if(!user){setBattleInvites([]);setUnreadPrivateMessages([]);return}
  const readKeyPrefix=`auraPrivateRead:${user.uid}:`
  const inviteQ=query(collection(db,'battleInvites'),where('receiverId','==',user.uid),limit(30))
  const unsubInvites=onSnapshot(inviteQ,s=>{
    const rows=s.docs.map(d=>({id:d.id,...d.data()} as BattleInvite)).filter(x=>x.receiverId===user.uid&&x.status==='pending'&&x.roomCode)
    rows.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))
    setBattleInvites(rows)
  },e=>{console.error('Battle invitations load error:',e);setBattleInvites([])})

  const q=query(collection(db,'privateChats'),where('participants','array-contains',user.uid),limit(200))
  const unsubMessages=onSnapshot(q,s=>{
    const rows=s.docs.map(d=>({id:d.id,...d.data()} as ChatMsg)).filter(m=>m.uid!==user.uid&&m.type!=='battleInvite')
    const unread=rows.filter(m=>{
      const otherId=m.uid
      const readAt=Number(localStorage.getItem(`${readKeyPrefix}${otherId}`)||0)
      const createdAt=(m.createdAt?.toMillis?.()||((m.createdAt?.seconds||0)*1000))
      return createdAt>readAt
    })
    unread.sort((a,b)=>{
      const ta=(a.createdAt?.toMillis?.()||((a.createdAt?.seconds||0)*1000))
      const tb=(b.createdAt?.toMillis?.()||((b.createdAt?.seconds||0)*1000))
      return tb-ta
    })
    setUnreadPrivateMessages(unread.slice(0,20))
  },e=>{console.error('Private notifications load error:',e);setUnreadPrivateMessages([])})
  return()=>{unsubInvites();unsubMessages()}
},[user])

useEffect(()=>{
  if(!user){setFriends([]);return}
  const q=query(collection(db,'friendships'),where('participants','array-contains',user.uid))
  return onSnapshot(q,async s=>{
    const ids=s.docs.map(d=>{const x=d.data(); return (x.participants||[]).find((id:string)=>id!==user.uid) as string}).filter(Boolean)
    if(!ids.length){setFriends([]);return}
    const profiles=await Promise.all(ids.map(async(id:string)=>{
      try{const fs=await getDoc(doc(db,'users',id));if(!fs.exists())return null;const x=fs.data();return{id,name:String(x.nombre||x.name||x.displayName||'Jugador'),aura:Number(x.aura||0)} as Friend}catch{return null}}))
    setFriends(profiles.filter(Boolean) as Friend[])
  },e=>{console.error('Friendships load error:',e);setFriends([])})
 },[user])

async function sendPushEvent(targetUid:string,event:string,refId:string){
  if(!user||!targetUid||targetUid===user.uid)return
  try{
    const idToken=await user.getIdToken()
    await fetch('/api/push/notify',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${idToken}`},body:JSON.stringify({event,targetUid,refId})})
  }catch(error){console.warn('Push event delivery skipped:',error)}
}

async function enableNotifications(){
  if(!user)return
  setPushBusy(true); setPushStatus('')
  try{
    const result=await enableWebPush()
    const tokenId=await hashToken(result.token)
    await setDoc(doc(db,'users',user.uid,'pushTokens',tokenId),{token:result.token,platform:'web',updatedAt:serverTimestamp()},{merge:true})
    setPushStatus('🔔 Notificaciones activadas en este dispositivo.')
    try{
      const idToken=await user.getIdToken()
      await fetch('/api/push/register-check',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${idToken}`},body:JSON.stringify({token:result.token})})
    }catch{}
  }catch(error:any){
    const code=String(error?.message||'push-error')
    const messages:Record<string,string>={
      'notifications-not-supported':'⚠️ Este dispositivo/navegador no admite notificaciones web.',
      'service-worker-not-supported':'⚠️ Este navegador no admite Service Worker.',
      'https-required':'⚠️ Las notificaciones requieren HTTPS.',
      'fcm-not-supported':'⚠️ FCM Web no está disponible en este entorno. En un APK WebView necesitaremos la integración nativa de Android.',
      'notification-permission-denied':'⚠️ Bloqueaste el permiso de notificaciones en Android. Actívalo desde los permisos del navegador/app.',
      'notification-permission-default':'ℹ️ No se concedió el permiso de notificaciones.',
      'fcm-token-empty':'⚠️ Firebase no pudo registrar este dispositivo.'
    }
    setPushStatus(messages[code]||`⚠️ No se pudieron activar las notificaciones (${code}).`)
  }finally{setPushBusy(false)}
}

async function hashToken(token:string){
  const data=new TextEncoder().encode(token)
  const digest=await crypto.subtle.digest('SHA-256',data)
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,40)
}

useEffect(()=>{
  pushUnsubRef.current?.(); pushUnsubRef.current=null
  if(!user)return
  if(typeof Notification==='undefined'||Notification.permission!=='granted')return
  void listenForegroundMessages(payload=>{
    const n=payload.notification||{}
    setPushStatus(`🔔 ${n.title||'Nueva notificación'}: ${n.body||'Tienes una nueva notificación.'}`)
  }).then(unsub=>{pushUnsubRef.current=unsub}).catch(()=>{})
  return()=>{pushUnsubRef.current?.();pushUnsubRef.current=null}
},[user])

useEffect(()=>{ if(!user)return; setChatLoading(true); setChatMsg(''); const q=query(collection(db,'chat'),orderBy('createdAt','desc'),limit(60)); return onSnapshot(q,s=>{setChat(s.docs.map(d=>({id:d.id,...d.data()} as ChatMsg)).reverse());setChatLoading(false)},e=>{console.error('Global chat load error:',e);setChatLoading(false);setChatMsg('⚠️ No se pudo cargar el chat global.')}) },[user])
 useEffect(()=>{ if(!user)return; const q=query(collection(db,'users'),orderBy('aura','desc'),limit(100)); return onSnapshot(q,s=>{const rows=s.docs.map(d=>{const x=d.data();return{id:d.id,name:String(x.nombre||x.name||x.displayName||'Jugador'),aura:Number(x.aura||0)}});setLeaders(rows.slice(0,25));const idx=rows.findIndex(x=>x.id===user.uid);setMyRank(idx>=0?idx+1:null)}) },[user])
 useEffect(()=>{ if(!user){setClans([]);setMyClanId(null);setSelectedClan(null);return} const q=query(collection(db,'clans'),orderBy('createdAt','desc'),limit(50)); return onSnapshot(q,s=>{ const rows=s.docs.map(d=>({id:d.id,...d.data()} as Clan)); setClans(rows); const mine=rows.find(c=>Array.isArray(c.members)&&c.members.includes(user.uid)); setMyClanId(mine?.id||null); setSelectedClan(prev=>prev?rows.find(c=>c.id===prev.id)||null:prev) },e=>{console.error('Clans load error:',e);setClans([])}) },[user])
 useEffect(()=>{ if(!user){setClanSearchResults(null);setClanSearching(false);return} const term=clanSearch.trim().toLowerCase(); if(!term){setClanSearchResults(null);setClanSearching(false);return} const timer=setTimeout(async()=>{setClanSearching(true); try{ const end=term+'\uf8ff'; const [nameSnap,tagSnap]=await Promise.all([getDocs(query(collection(db,'clans'),where('nameLower','>=',term),where('nameLower','<=',end),limit(50))),getDocs(query(collection(db,'clans'),where('tagLower','>=',term),where('tagLower','<=',end),limit(50)))]); const merged=new Map<string,Clan>(); [...nameSnap.docs,...tagSnap.docs].forEach(d=>merged.set(d.id,{id:d.id,...d.data()} as Clan)); const local=clans.filter(c=>`${c.name||''} ${c.tag||''}`.toLowerCase().includes(term)); local.forEach(c=>merged.set(c.id,c)); setClanSearchResults([...merged.values()].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')))); }catch(error){console.error('Clan search error:',error); const fallback=clans.filter(c=>`${c.name||''} ${c.tag||''}`.toLowerCase().includes(term)); setClanSearchResults(fallback); } finally{setClanSearching(false)} },250); return()=>clearTimeout(timer) },[user,clanSearch,clans])
 useEffect(()=>{ if(!user){setMyClanRequests([]);return} const q=query(collection(db,'clanJoinRequests'),where('requesterId','==',user.uid),limit(50)); return onSnapshot(q,s=>{setMyClanRequests(s.docs.map(d=>({id:d.id,...d.data()} as ClanJoinRequest)))},e=>{console.error('Clan request load error:',e);setMyClanRequests([])}) },[user])
 useEffect(()=>{ if(!user){setClanInvitesSent([]);return} const q=query(collection(db,'clanJoinRequests'),where('requesterId','==',user.uid),limit(100)); return onSnapshot(q,s=>setClanInvitesSent(s.docs.map(d=>({id:d.id,...d.data(),senderId:(d.data() as any).requesterId} as ClanInvite)).filter(r=>r.status==='pending'&&r.kind==='invite')),e=>{console.error('Clan sent invite load error:',e);setClanInvitesSent([])}) },[user])
 useEffect(()=>{ if(!user){setUnreadClanInvites([]);return} const q=query(collection(db,'clanJoinRequests'),where('receiverId','==',user.uid),limit(50)); return onSnapshot(q,s=>{const rows=s.docs.map(d=>({id:d.id,...d.data(),senderId:(d.data() as any).requesterId} as ClanInvite)).filter(r=>r.status==='pending'&&r.kind==='invite'); rows.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)); const unread=rows.filter(r=>localStorage.getItem(`auraClanInviteRead:${user.uid}:${r.id}`)!=='1'); setUnreadClanInvites(unread)},e=>{console.error('Clan invite notification load error:',e);setUnreadClanInvites([])}) },[user])
 useEffect(()=>{
  if(!user){setUnreadClanJoinRequests([]);return}
  let requestUnsub=()=>{}
  let ownerRows:Clan[]=[]; let coLeaderRows:Clan[]=[]
  const refreshRequests=()=>{
    const ids=[...new Set([...ownerRows,...coLeaderRows].map(c=>c.id).filter(Boolean))]
    requestUnsub(); requestUnsub=()=>{}
    if(!ids.length){setUnreadClanJoinRequests([]);return}
    const rq=ids.length===1
      ? query(collection(db,'clanJoinRequests'),where('clanId','==',ids[0]),limit(100))
      : query(collection(db,'clanJoinRequests'),where('clanId','in',ids.slice(0,30)),limit(100))
    requestUnsub=onSnapshot(rq,s=>{
      const rows=s.docs.map(d=>({id:d.id,...d.data()} as ClanJoinRequest)).filter(r=>r.status==='pending'&&r.kind!=='invite')
      rows.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))
      const unread=rows.filter(r=>localStorage.getItem(`auraClanJoinRead:${user.uid}:${r.id}`)!=='1')
      setUnreadClanJoinRequests(unread)
    },e=>{console.error('Clan notification load error:',e);setUnreadClanJoinRequests([])})
  }
  const ownerQ=query(collection(db,'clans'),where('owner','==',user.uid),limit(20))
  const coQ=query(collection(db,'clans'),where('coLeader','==',user.uid),limit(20))
  const unsubOwner=onSnapshot(ownerQ,s=>{ownerRows=s.docs.map(d=>({id:d.id,...d.data()} as Clan));refreshRequests()},e=>{console.error('Owner clan notification load error:',e);ownerRows=[];refreshRequests()})
  const unsubCo=onSnapshot(coQ,s=>{coLeaderRows=s.docs.map(d=>({id:d.id,...d.data()} as Clan));refreshRequests()},e=>{console.error('Co-leader clan notification load error:',e);coLeaderRows=[];refreshRequests()})
  return()=>{unsubOwner();unsubCo();requestUnsub()}
 },[user])
 useEffect(()=>{ if(!user||!selectedClan){setClanJoinRequests([]);setClanMembers([]);return} let cancelled=false; const loadMembers=async()=>{const ids=Array.isArray(selectedClan.members)?selectedClan.members:[]; const profiles=await Promise.all(ids.map(async id=>{try{const fs=await getDoc(doc(db,'users',id));if(!fs.exists())return{id,name:id===selectedClan.owner?'Líder':'Jugador',aura:0};const x=fs.data();return{id,name:String(x.nombre||x.name||x.displayName||'Jugador'),aura:Number(x.aura||0)}}catch{return{id,name:id===selectedClan.owner?'Líder':'Jugador',aura:0}}})); if(!cancelled)setClanMembers(profiles)}; void loadMembers(); const q=query(collection(db,'clanJoinRequests'),where('clanId','==',selectedClan.id),limit(100)); const unsub=onSnapshot(q,s=>{const rows=s.docs.map(d=>({id:d.id,...d.data()} as ClanJoinRequest)).filter(r=>r.status==='pending'&&r.kind!=='invite'); setClanJoinRequests(rows)},e=>{console.error('Clan join requests load error:',e);setClanJoinRequests([])}); return()=>{cancelled=true;unsub()} },[user,selectedClan?.id,selectedClan?.members?.join(',')])

useEffect(()=>{
  if(!user||!selectedClan||!selectedClan.members?.includes(user.uid)){
    setClanChat([]); setClanChatInput(''); setClanChatMsg(''); setUnreadClanChatCount(0); return
  }
  setClanChatLoading(true); setClanChatMsg('')
  const q=query(collection(db,'clanChats'),where('clanId','==',selectedClan.id),limit(200))
  return onSnapshot(q,s=>{
    const rows=s.docs.map(d=>({id:d.id,...d.data()} as ClanChatMsg))
    rows.sort((a,b)=>{const ta=a.createdAt?.toMillis?.()||((a.createdAt?.seconds||0)*1000);const tb=b.createdAt?.toMillis?.()||((b.createdAt?.seconds||0)*1000);return ta-tb})
    setClanChat(rows); setClanChatLoading(false)
    const readAt=Number(localStorage.getItem(`auraClanChatRead:${user.uid}:${selectedClan.id}`)||0)
    setUnreadClanChatCount(rows.filter(m=>m.uid!==user.uid&&((m.createdAt?.toMillis?.()||((m.createdAt?.seconds||0)*1000))>readAt)).length)
  },e=>{console.error('Clan chat load error:',e);setClanChat([]);setClanChatLoading(false);setClanChatMsg(`⚠️ No se pudo cargar el chat del clan${e?.code?` (${e.code})`:''}.`)})
},[user,selectedClan?.id,selectedClan?.members?.join(',')])

useEffect(()=>{
  if(!user||!selectedClan||!selectedClan.members?.includes(user.uid)||!clanChat.length)return
  const latest=clanChat[clanChat.length-1]
  const latestMs=latest?.createdAt?.toMillis?.()||((latest?.createdAt?.seconds||0)*1000)
  if(latestMs) localStorage.setItem(`auraClanChatRead:${user.uid}:${selectedClan.id}`,String(latestMs))
  setUnreadClanChatCount(0)
},[user,selectedClan?.id,clanChat])

async function sendClanChat(e:FormEvent){
  e.preventDefault(); const text=clanChatInput.trim()
  if(!text||!user||!selectedClan||!selectedClan.members?.includes(user.uid))return
  setClanChatMsg(''); setClanChatInput('')
  try{
    const clanMessageRef=await addDoc(collection(db,'clanChats'),{clanId:selectedClan.id,uid:user.uid,name:user.displayName||'Jugador',text,createdAt:serverTimestamp()})
    void Promise.all((selectedClan.members||[]).filter(id=>id!==user.uid).map(id=>sendPushEvent(id,'clan_chat',clanMessageRef.id)))
  }catch(error:any){
    console.error('Clan chat send error:',error); setClanChatInput(text); setClanChatMsg(`⚠️ No se pudo enviar el mensaje al clan${error?.code?` (${error.code})`:''}.`)
  }
}
 useEffect(()=>{socket.on('online-count',(n:number)=>setOnline(n)); return()=>{socket.off('online-count')}},[])
 useEffect(()=>{
  socket.on('peer-joined',()=>{setOpponentJoined(true);setOpponentReady(false);setBattleReady(false);setRoomStatus('Rival conectado. Activen ambas cámaras para comenzar.')})
  socket.on('peer-camera-ready',()=>setRoomStatus(battleReady?'⏳ Estás listo. Esperando al rival…':'El rival tiene la cámara lista. Activa la tuya para comenzar.'))
  socket.on('battle-ready-status',({readyCount,total,ready}:{readyCount:number;total:number;ready:{id:string;ready:boolean}[]})=>{
    const other=ready.find(x=>x.id!==socket.id)
    setOpponentReady(!!other?.ready)
    if(readyCount<total) setRoomStatus(battleReady?'⏳ Estás listo. Esperando al rival…':'🎥 Ambas cámaras están listas. Pulsa LISTO cuando estés preparado.')
  })
  socket.on('both-cameras-ready',async()=>{
    setBothCamerasReady(true)
    setBattleReady(false)
    setOpponentReady(false)
    setRoomStatus('🎥 Ambas cámaras están listas. Pulsa LISTO cuando estés preparado.')
    if(hostRef.current){
      const pc=peerRef.current||await preparePeer()
      if(pc.signalingState==='stable' && pc.connectionState!=='connected'){
        const offer=await pc.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:true})
        await pc.setLocalDescription(offer)
        socket.emit('signal',{description:pc.localDescription})
      }
    }
  })
  socket.on('battle-countdown',({startsAt}:{startsAt:number})=>{
    setBattleCountdown(Math.max(0,Math.ceil((startsAt-Date.now())/1000)))
    setBattleStarted(false)
    setBattleSeconds(0)
    setBattleResult(null)
    setRoomStatus('⏱️ ¡Prepárense! La batalla comienza en 5 segundos…')
  })
  socket.on('start',({endsAt}:{endsAt:number})=>{
    battleResultHandledRef.current=false
    setBattleResult(null)
    setBattleReady(false)
    setOpponentReady(false)
    setBattleCountdown(0)
    setBattleStarted(true)
    setRoomStatus('🔥 ¡BATALLA DE AURA EN CURSO!')
    setBattleSeconds(Math.max(0,Math.ceil((endsAt-Date.now())/1000)))
  })
  const stopBattleMedia=()=>{
    if(localStreamRef.current){localStreamRef.current.getTracks().forEach(track=>track.stop());localStreamRef.current=null}
    if(peerRef.current){
      peerRef.current.getSenders().forEach(sender=>sender.track?.stop())
      peerRef.current.getReceivers().forEach(receiver=>receiver.track?.stop())
      peerRef.current.close()
      peerRef.current=null
    }
    if(videoRef.current)videoRef.current.srcObject=null
    if(remoteVideoRef.current)remoteVideoRef.current.srcObject=null
    setCameraOn(false)
    setBothCamerasReady(false)
    cameraSourceRef.current=null
  }
  socket.on('battle-ended',async({aura1,aura2,winnerId}:{aura1:number;aura2:number;winnerId?:string})=>{

    if(battleResultHandledRef.current)return
    battleResultHandledRef.current=true
    const score1=Math.round(aura1||0)
    const score2=Math.round(aura2||0)
    const localScore=hostRef.current?score1:score2
    const rivalScore=hostRef.current?score2:score1
    const draw=localScore===rivalScore
    const win=winnerId ? winnerId===socket.id : localScore>rivalScore
    const outcome: 'win'|'loss'|'draw'=draw?'draw':(win?'win':'loss')
    const delta=outcome==='win'?25:(outcome==='draw'?10:5)

    // Detener cámaras y conexión de vídeo inmediatamente al finalizar.
    stopBattleMedia()
    setBattleStarted(false)
    setBattleSeconds(0)
    movementScoreRef.current=0
    previousPoseRef.current=null
    setAura(localScore)
    setOpponentAura(rivalScore)
    setRoomStatus(outcome==='draw'?'🤝 Batalla empatada':outcome==='win'?'🏆 Batalla ganada':'💥 Batalla perdida')

    // Mostrar el resultado INMEDIATAMENTE, antes de guardar en Firestore.
    // Así ningún retraso de red/permisos puede dejar la pantalla de batalla pegada.
    setBattleResult({outcome,localScore,rivalScore,delta})
    window.history.pushState({auraTab:'battle-result'},'',window.location.href)

    const currentUser=auth.currentUser
    if(currentUser){
      try{
        const ref=doc(db,'users',currentUser.uid)
        const snap=await getDoc(ref)
        const current=snap.exists()?snap.data():{}
        const currentAura=Number(current.aura||0)
        const currentWins=Number(current.victorias||0)
        const currentLosses=Number(current.derrotas||0)
        const currentDraws=Number(current.empates||0)
        const currentBattles=Number(current.batallas||0)
        const currentEarned=Number(current.auraGanada||0)
        const currentStreak=Number(current.rachaActual||0)
        const currentBest=Number(current.mejorRacha||0)
        const nextAura=Math.max(0,currentAura+delta)
        const nextWins=currentWins+(outcome==='win'?1:0)
        const nextLosses=currentLosses+(outcome==='loss'?1:0)
        const nextDraws=currentDraws+(outcome==='draw'?1:0)
        const nextBattles=currentBattles+1
        const nextStreak=outcome==='win'?currentStreak+1:0
        const nextBest=Math.max(currentBest,nextStreak)
        const nextEarned=currentEarned+delta
        const nextLevel=Math.min(100,Math.max(1,Math.floor(nextAura/100)+1))
        await setDoc(ref,{aura:nextAura,victorias:nextWins,derrotas:nextLosses,empates:nextDraws,batallas:nextBattles,auraGanada:nextEarned,rachaActual:nextStreak,mejorRacha:nextBest,level:nextLevel},{merge:true})
        setProfile({aura:nextAura,wins:nextWins,losses:nextLosses,draws:nextDraws,battles:nextBattles,auraEarned:nextEarned,currentStreak:nextStreak,bestStreak:nextBest,level:nextLevel})
      }catch(e){console.error('Battle result save error:',e);setRoomStatus('⚠️ La batalla terminó, pero no pudimos guardar el resultado.')}
    }

  })
  socket.on('opponent-aura',(v:number)=>setOpponentAura(Math.round(v)))
  socket.on('battle-cancelled',({reason}:{reason:string})=>{
    setBattleCountdown(0);setBattleStarted(false);setBattleReady(false);setOpponentReady(false)
    setRoomStatus(`⚠️ ${reason||'La batalla fue cancelada.'}`)
  })
  socket.on('content-violation',({reason}:{reason:string})=>{
    safetyViolationRef.current=true
    if(localStreamRef.current){localStreamRef.current.getTracks().forEach(t=>t.stop());localStreamRef.current=null}
    if(videoRef.current)videoRef.current.srcObject=null
    if(remoteVideoRef.current)remoteVideoRef.current.srcObject=null
    peerRef.current?.close();peerRef.current=null
    setCameraOn(false);setBattleStarted(false);setBattleCountdown(0);setBattleReady(false);setBothCamerasReady(false);setOpponentReady(false)
    setRoomStatus(`🚨 Batalla cancelada: ${reason||'contenido no permitido detectado.'}`)
  })
  socket.on('peer-left',()=>{setOpponentJoined(false);setBothCamerasReady(false);setBattleReady(false);setOpponentReady(false);setBattleStarted(false);setRoomStatus('El rival salió de la sala.')})
  socket.on('signal',async(m:any)=>{
    try{
      const pc=peerRef.current||await preparePeer()
      if(m.description){
        await pc.setRemoteDescription(m.description)
        if(m.description.type==='offer'){
          const answer=await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socket.emit('signal',{description:pc.localDescription})
        }
      }
      if(m.candidate){
        if(pc.remoteDescription) await pc.addIceCandidate(m.candidate)
        else pendingIceRef.current.push(m.candidate)
      }
      if(pc.remoteDescription&&pendingIceRef.current.length){
        const queued=[...pendingIceRef.current]; pendingIceRef.current=[]
        for(const candidate of queued) await pc.addIceCandidate(candidate)
      }
    }catch(e){console.warn('WebRTC signal error',e)}
  })
  return()=>{['peer-joined','peer-camera-ready','battle-ready-status','both-cameras-ready','start','battle-ended','opponent-aura','peer-left','content-violation','signal','battle-cancelled'].forEach(x=>socket.off(x))}
 },[])
 useEffect(()=>{
  const audio=battleMusicRef.current;
  if(!audio)return;
  audio.volume=0.42;
  if(battleStarted && musicOn){ audio.currentTime=0; void audio.play().catch(()=>setRoomStatus('🔊 Toca el botón de música para activar el sonido de la batalla.')); }
  else { audio.pause(); if(!battleStarted) audio.currentTime=0; }
},[battleStarted,musicOn])

useEffect(()=>{
  if(!cameraOn||tab!=='ai'||!aiVideoRef.current||!localStreamRef.current)return;
  const v=aiVideoRef.current;
  v.srcObject=localStreamRef.current; v.muted=true; v.playsInline=true; void v.play().catch(()=>{});
},[cameraOn,tab])

useEffect(()=>{
  if(tab==='ai') return;
  // If the camera was activated only for IA Aura, release it when leaving the tab.
  if(cameraSourceRef.current==='ai' && localStreamRef.current){
    localStreamRef.current.getTracks().forEach(track=>track.stop());
    localStreamRef.current=null;
    if(aiVideoRef.current) aiVideoRef.current.srcObject=null;
    if(videoRef.current) videoRef.current.srcObject=null;
    cameraSourceRef.current=null;
    setCameraOn(false);
    setAura(0);
  }
},[tab])

useEffect(()=>{
  if(!battleStarted)return
  const timer=window.setInterval(()=>setBattleSeconds(v=>Math.max(0,v-1)),1000)
  return()=>clearInterval(timer)
},[battleStarted])

useEffect(()=>{
  if(battleCountdown<=0)return
  const timer=window.setInterval(()=>setBattleCountdown(v=>Math.max(0,v-1)),1000)
  return()=>clearInterval(timer)
},[battleCountdown])

useEffect(()=>{
  let cancelled=false
  async function loadSafetyModel(){
    if(safetyModelRef.current||safetyLoadingRef.current)return
    if(!window.nsfwjs){console.warn('NSFWJS no está disponible');return}
    safetyLoadingRef.current=true
    try{
      const model=await window.nsfwjs.load()
      if(!cancelled){safetyModelRef.current=model;setSafetyReady(true)}
    }catch(e){console.warn('No se pudo cargar el filtro de seguridad',e)}
    finally{safetyLoadingRef.current=false}
  }
  if(cameraOn && tab==='battle')void loadSafetyModel()
  return()=>{cancelled=true}
},[cameraOn,tab])

useEffect(()=>{
  let cancelled=false
  async function loadPose(){
    if(poseLandmarkerRef.current||poseLoadingRef.current)return
    poseLoadingRef.current=true
    setPoseReady(false)
    try{
      const vision=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm')
      const landmarker=await PoseLandmarker.createFromModelPath(vision,'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task')
      await landmarker.setOptions({runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:0.45,minPosePresenceConfidence:0.45,minTrackingConfidence:0.45})
      if(cancelled){landmarker.close()}else {poseLandmarkerRef.current=landmarker;setPoseReady(true)}
    }catch(e){console.warn('No se pudo cargar la IA de movimiento',e)}
    finally{poseLoadingRef.current=false}
  }
  if(cameraOn)void loadPose()
  return()=>{cancelled=true}
},[cameraOn])

useEffect(()=>{
  if(!cameraOn||(!battleStarted&&!trainingActive))return
  const v=(battleStarted?videoRef.current:aiVideoRef.current)
  if(!v)return
  let raf=0
  let stopped=false
  const resetMovement=()=>{previousPoseRef.current=null;poseHistoryRef.current=[];movementScoreRef.current=0;poseFrameCountRef.current=0;poseVisibleFrameCountRef.current=0;lastPoseTimeRef.current=0;lastMoveAtRef.current=0;patternScoreRef.current=0;lastMoveBonusRef.current=0;setAura(0);setMoveBonus(0);setDetectedMove('Esperando movimiento…')}
  if(!battleStarted&&!trainingActive)resetMovement()
  const scorePose=()=>{
    if(stopped)return
    if(v.readyState>=2&&poseLandmarkerRef.current){
      const now=performance.now()
      if(now-lastPoseTimeRef.current>=120){
        lastPoseTimeRef.current=now
        try{
          const result=poseLandmarkerRef.current.detectForVideo(v,now)
          const lm=result.landmarks?.[0]
          poseFrameCountRef.current+=1
          if(lm&&lm.length>=29){
            poseVisibleFrameCountRef.current+=1
            const ids=[11,12,13,14,15,16,23,24,25,26,27,28]
            const current=ids.map(i=>({x:lm[i].x,y:lm[i].y,z:lm[i].z,visibility:lm[i].visibility??1}))
            const valid=current.filter(p=>p.visibility>0.35)
            const prev=previousPoseRef.current
            if(prev&&valid.length>=8){
              let movement=0,weight=0
              for(let i=0;i<current.length;i++){
                const a=current[i],b=prev[i]
                if(a.visibility<=0.35||b.visibility<=0.35)continue
                const d=Math.hypot(a.x-b.x,a.y-b.y,(a.z-b.z)*0.35)
                movement+=Math.min(0.18,d);weight+=1
              }
              if(weight){
                const shoulderWidth=Math.max(0.08,Math.hypot(current[0].x-current[1].x,current[0].y-current[1].y))
                const hipWidth=Math.max(0.08,Math.hypot(current[6].x-current[7].x,current[6].y-current[7].y))
                const bodyScale=Math.max(0.12,(shoulderWidth+hipWidth)/2)
                const normalized=(movement/weight)/bodyScale
                movementScoreRef.current+=Math.min(0.11,Math.max(0,normalized))
              }
            }
            previousPoseRef.current=current

            // Historial corto para reconocer patrones básicos de farmeo de aura.
            poseHistoryRef.current.push(current)
            if(poseHistoryRef.current.length>14)poseHistoryRef.current.shift()

            const nose=lm[0], ls=lm[11], rs=lm[12], le=lm[13], re=lm[14], lw=lm[15], rw=lm[16], lh=lm[23], rh=lm[24], lk=lm[25], rk=lm[26], la=lm[27], ra=lm[28]
            const dist=(a:any,b:any)=>Math.hypot(a.x-b.x,a.y-b.y)
            const avg=(a:any,b:any)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2})
            const shoulder=Math.max(0.08,dist(ls,rs))
            const hip=Math.max(0.08,dist(lh,rh))
            const body=Math.max(0.12,(shoulder+hip)/2)
            const wristsAtChest=lw.y>Math.min(ls.y,rs.y)&&lw.y<Math.max(lh.y,rh.y)+body*0.2&&rw.y>Math.min(ls.y,rs.y)&&rw.y<Math.max(lh.y,rh.y)+body*0.2
            const handsWide=dist(lw,rw)>shoulder*1.8
            const armsRaised=lw.y<ls.y&&rw.y<rs.y
            const handNearFace=dist(lw,nose)<body*0.85||dist(rw,nose)<body*0.85
            const upright=Math.abs(((ls.y+rs.y)/2)-((lh.y+rh.y)/2))>body*0.75
            const hist=poseHistoryRef.current
            let moveName='Movimiento libre', bonus=0
            if(hist.length>=8){
              const first=hist[0], last=hist[hist.length-1]
              const fL=first[4], fR=first[5], lL=last[4], lR=last[5]
              const wristSwing=Math.abs((lL.x-fL.x)) + Math.abs((lR.x-fR.x))
              const last2=hist[hist.length-2]
              const alternation=Math.abs((lL.x-last2[4].x)) + Math.abs((lR.x-last2[5].x))
              const ankleTravel=Math.abs(last[10].x-first[10].x)+Math.abs(last[11].x-first[11].x)+Math.abs(last[10].y-first[10].y)+Math.abs(last[11].y-first[11].y)
              const jump=first[8].y-last[8].y>body*0.35 || first[9].y-last[9].y>body*0.35
              if(handNearFace&&upright){ moveName='😐 MEWING'; bonus=8 }
              else if(wristsAtChest&&wristSwing>body*0.55&&alternation>body*0.12){ moveName='🙌 SIX-SEVEN'; bonus=12 }
              else if(handsWide&&armsRaised&&(jump||wristSwing>body*0.8)){ moveName='⚡ SIUUU'; bonus=14 }
              else if(ankleTravel>body*0.8){ moveName='🚶 AURA WALK'; bonus=10 }
              else if(wristSwing>body*0.55||armsRaised){ moveName='✋ GESTO DE AURA'; bonus=6 }
            }
            // Una pose controlada también cuenta: evita premiar simplemente agitarse.
            if(bonus===0&&upright&&movementScoreRef.current<1.4&&hist.length>=6){ moveName='🧍 POSE DE AURA'; bonus=5 }
            const nowMove=performance.now()
            if(bonus>0&&nowMove-lastMoveAtRef.current>900){
              lastMoveAtRef.current=nowMove
              patternScoreRef.current=Math.min(20,patternScoreRef.current+bonus)
              lastMoveBonusRef.current=bonus
              setDetectedMove(moveName)
              setMoveBonus(bonus)
            }
          }
          const presence=poseFrameCountRef.current?poseVisibleFrameCountRef.current/poseFrameCountRef.current:0
          const motionPart=Math.min(100,(movementScoreRef.current/4.2)*100)
          const patternBonus=Math.min(20,patternScoreRef.current)
          const score=Math.round(Math.min(100,motionPart*0.72+presence*8+patternBonus))
          setAura(score)
          if(battleStarted)socket.emit('aura-score',score)
        }catch(e){console.warn('Pose analysis frame error',e)}
      }
    }
    raf=requestAnimationFrame(scorePose)
  }
  raf=requestAnimationFrame(scorePose)
  return()=>{stopped=true;cancelAnimationFrame(raf)}
},[cameraOn,battleStarted,trainingActive])

useEffect(()=>{
  if(!trainingActive)return
  const timer=window.setInterval(()=>setTrainingSeconds(v=>Math.max(0,v-1)),1000)
  return()=>window.clearInterval(timer)
},[trainingActive])

useEffect(()=>{
  if(!trainingActive||trainingSeconds!==0)return
  setTrainingActive(false)
  setTrainingDone(true)
  void (async()=>{
    if(!user)return
    try{
      const ref=doc(db,'users',user.uid)
      const snap=await getDoc(ref)
      const current=snap.exists()?snap.data():{}
      const nextAura=Number(current.aura||0)+1
      const nextLevel=Math.min(100,Math.max(1,Math.floor(nextAura/100)+1))
      const nextEarned=Number(current.auraGanada||0)+1
      await setDoc(ref,{aura:nextAura,auraGanada:nextEarned,level:nextLevel},{merge:true})
      setProfile(prev=>({...prev,aura:nextAura,auraEarned:nextEarned,level:nextLevel}))
    }catch(e){console.error('Training reward save error:',e);setRoomStatus('⚠️ El entrenamiento terminó, pero no pudimos guardar +1 Aura.')}
  })()
},[trainingActive,trainingSeconds,user])

useEffect(()=>{
  if(!cameraOn||tab!=='battle'||!safetyReady||!safetyModelRef.current||!videoRef.current)return
  let stopped=false
  let timeout=0
  const scan=async()=>{
    if(stopped||safetyViolationRef.current)return
    const now=performance.now()
    if(now-safetyScanAtRef.current<1200){timeout=window.setTimeout(scan,350);return}
    safetyScanAtRef.current=now
    const v=videoRef.current
    if(v&&v.readyState>=2){
      try{
        const predictions=await safetyModelRef.current.classify(v)
        const scores=Object.fromEntries(predictions.map((x:any)=>[String(x.className).toLowerCase(),Number(x.probability||0)]))
        const sexual=Math.max(scores.porn||0,scores.sexy||0,scores.hentai||0)
        if(sexual>=0.90){
          safetyViolationRef.current=true
          setRoomStatus('🚨 Contenido no permitido detectado. Cámara apagada y batalla cancelada.')
          socket.emit('content-violation',{reason:'Contenido sexual/desnudez potencialmente detectado'})
          localStreamRef.current?.getTracks().forEach(t=>t.stop()); localStreamRef.current=null
          if(videoRef.current)videoRef.current.srcObject=null
          if(remoteVideoRef.current)remoteVideoRef.current.srcObject=null
          peerRef.current?.close();peerRef.current=null
          setCameraOn(false);setBattleStarted(false);setBattleCountdown(0);setBattleReady(false);setBothCamerasReady(false)
          return
        }
      }catch(e){console.warn('Safety scan error',e)}
    }
    timeout=window.setTimeout(scan,350)
  }
  void scan()
  return()=>{stopped=true;window.clearTimeout(timeout)}
},[cameraOn,tab,safetyReady])

useEffect(()=>{
  if(!cameraOn||tab!=='battle'||!battleStarted)return
  const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition
  if(!SR)return
  const recognition=new SR()
  recognition.lang='es-CO';recognition.continuous=true;recognition.interimResults=true
  const badWords=['puta','puto','mierda','marica','hijo de puta','cabron','cabrón','pendejo','perra','verga','coño','joder']
  recognition.onresult=(event:any)=>{
    let text=''
    for(let i=event.resultIndex;i<event.results.length;i++)text+=' '+String(event.results[i][0]?.transcript||'').toLowerCase()
    if(badWords.some(w=>text.includes(w))&&!safetyViolationRef.current){
      safetyViolationRef.current=true
      setRoomStatus('🚨 Lenguaje inapropiado detectado. Cámara apagada y batalla cancelada.')
      socket.emit('content-violation',{reason:'Lenguaje inapropiado detectado'})
      localStreamRef.current?.getTracks().forEach(t=>t.stop());localStreamRef.current=null
      if(videoRef.current)videoRef.current.srcObject=null
      if(remoteVideoRef.current)remoteVideoRef.current.srcObject=null
      peerRef.current?.close();peerRef.current=null
      setCameraOn(false);setBattleStarted(false);setBattleCountdown(0);setBattleReady(false);setBothCamerasReady(false)
    }
  }
  recognition.onerror=()=>{}
  recognition.onend=()=>{if(!safetyViolationRef.current&&battleStarted)try{recognition.start()}catch{}}
  speechRecognitionRef.current=recognition
  try{recognition.start()}catch{}
  return()=>{try{recognition.onend=null;recognition.stop()}catch{}speechRecognitionRef.current=null}
},[cameraOn,tab,battleStarted])

 async function handleAuth(e:FormEvent){e.preventDefault();setAuthMsg('');try{if(authMode==='register'){if(!legalAccepted)return setAuthMsg('Debes aceptar el Reglamento Oficial, los Términos y Condiciones y la Política de Privacidad para crear tu cuenta.');if(name.trim().length<2)return setAuthMsg('Escribe un nombre de jugador.');if(password!==password2)return setAuthMsg('Las contraseñas no coinciden.');if(password.length<6)return setAuthMsg('La contraseña debe tener al menos 6 caracteres.');const c=await createUserWithEmailAndPassword(auth,email,password);const clean=name.trim();await updateProfile(c.user,{displayName:clean});await setDoc(doc(db,'users',c.user.uid),{uid:c.user.uid,nombre:clean,nombreLower:clean.toLowerCase(),email,aura:0,victorias:0,derrotas:0,level:1,legalAccepted:true,legalVersion:'1.0',legalAcceptedAt:serverTimestamp(),reglamentoVersion:'1.0',terminosVersion:'1.0',privacidadVersion:'1.0',createdAt:serverTimestamp()},{merge:true})}else await signInWithEmailAndPassword(auth,email,password)}catch(e:any){setAuthMsg(e?.message?.replace('Firebase: Error (auth/','').replace(').','')||'No se pudo completar la operación.')}}
 async function resetPassword(){if(!email.trim()){setAuthMsg('Escribe tu correo para recuperar la contraseña.');return}try{await sendPasswordResetEmail(auth,email.trim());setResetSent(true);setAuthMsg('Te enviamos un enlace para restablecer tu contraseña.')}catch(e:any){setAuthMsg('No pudimos enviar el enlace de recuperación. Revisa el correo.')}}
 async function loginWithGoogle(){
  setAuthMsg('')
  const ua=typeof navigator!=='undefined'?navigator.userAgent:''
  const isAndroidWebView=/Android/i.test(ua)&&(/\bwv\b/i.test(ua)||/;\s*wv\)/i.test(ua)||!/Chrome\//i.test(ua))
  try{
    await setPersistence(auth,browserLocalPersistence)
    const provider=new GoogleAuthProvider()
    provider.setCustomParameters({prompt:'select_account'})
    if(isAndroidWebView){await signInWithRedirect(auth,provider);return}
    const result=await signInWithPopup(auth,provider)
    setUser(result.user);setAuthReady(true);setAuthMode('choice');setTab('home');setAuthMsg('')
  }catch(e:any){
    console.error('Google sign-in error:',e)
    const code=e?.code||''
    if(code==='auth/popup-blocked'||code==='auth/popup-cancelled-by-user'||code==='auth/cancelled-popup-request'){
      try{const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await signInWithRedirect(auth,provider);return}catch(re:any){setAuthMsg(re?.message?.replace('Firebase: Error (auth/','').replace(').','')||'No se pudo iniciar sesión con Google.');return}
    }
    setAuthMsg(e?.message?.replace('Firebase: Error (auth/','').replace(').','')||'No se pudo iniciar sesión con Google.')
  }
 }

 function returnToHome(){
   if(localStreamRef.current){localStreamRef.current.getTracks().forEach(t=>t.stop());localStreamRef.current=null}
   if(videoRef.current) videoRef.current.srcObject=null
   if(remoteVideoRef.current) remoteVideoRef.current.srcObject=null
   peerRef.current?.close();peerRef.current=null
   setCameraOn(false);setBothCamerasReady(false);setPoseReady(false);setBattleReady(false);setOpponentReady(false);setBattleStarted(false);setBattleCountdown(0);setBattleSeconds(0);setBattleResult(null);setTrainingActive(false);setTrainingSeconds(0);setTrainingDone(false);safetyViolationRef.current=false
   battleResultHandledRef.current=false
   setRoomCode('');setRoom('');setOpponentJoined(false);setOpponentAura(0);setAura(0);movementScoreRef.current=0;previousPoseRef.current=null;poseFrameCountRef.current=0;poseVisibleFrameCountRef.current=0;setRoomStatus('Listo.')
   window.history.replaceState({auraTab:'home'},'',window.location.href)
   setTab('home')
 }
 async function finishBattle(){if(!user||!battleStarted)return;socket.emit('finish-battle');setRoomStatus('⏳ Finalizando la batalla…')}
 async function logout(){localStreamRef.current?.getTracks().forEach(x=>x.stop());peerRef.current?.close();await signOut(auth);socket.disconnect();navigateTab('home')}
 async function resetPeer(){pendingIceRef.current=[]; if(peerRef.current){peerRef.current.ontrack=null;peerRef.current.onicecandidate=null;peerRef.current.close();peerRef.current=null} setBothCamerasReady(false);setBattleStarted(false);setBattleCountdown(0);setBattleSeconds(0);setOpponentAura(0)}
 async function createRoom(){hostRef.current=true;await resetPeer();if(!socket.connected)socket.connect();socket.emit('create',(r:any)=>{if(r?.ok){setRoomCode(r.code);setHost(true);hostRef.current=true;setOpponentJoined(false);setRoomStatus('Esperando al rival…');navigateTab('battle')}})}
 function joinRoomCode(code:string){void resetPeer();if(!socket.connected)socket.connect();socket.emit('join',code.trim().toUpperCase(),(r:any)=>{if(r?.ok){setRoomCode(r.code);setRoom(r.code);setHost(false);hostRef.current=false;setOpponentJoined(true);setRoomStatus('Conectado a la sala. Activa tu cámara.');navigateTab('battle')}else setRoomStatus(r?.error||'No se pudo unir a la sala.')})}
 function joinRoom(){joinRoomCode(room)}
 function attachLocalStream(stream:MediaStream){
   localStreamRef.current=stream
   const video=videoRef.current
   const aiVideo=aiVideoRef.current
   if(aiVideo){
     aiVideo.srcObject=stream
     aiVideo.muted=true
     aiVideo.playsInline=true
     void aiVideo.play().catch(()=>{})
   }
   if(video){
     video.srcObject=stream
     video.muted=true
     video.playsInline=true
     void video.play().catch(()=>{})
   }
   const pc=peerRef.current
   if(pc){
     const existing=pc.getSenders().map(sender=>sender.track?.id).filter(Boolean)
     for(const track of stream.getTracks()){if(!existing.includes(track.id)) pc.addTrack(track,stream)}
   }
 }
 async function preparePeer(){
   if(peerRef.current) return peerRef.current
   const pc=new RTCPeerConnection({iceServers:[
     {urls:'stun:stun.l.google.com:19302'},
     {urls:'stun:stun1.l.google.com:19302'}
   ]})
   peerRef.current=pc
   if(localStreamRef.current) localStreamRef.current.getTracks().forEach(track=>pc.addTrack(track,localStreamRef.current!))
   pc.onicecandidate=e=>{if(e.candidate)socket.emit('signal',{candidate:e.candidate})}
   pc.ontrack=e=>{
     const stream=e.streams[0]
     if(remoteVideoRef.current&&stream){
       remoteVideoRef.current.srcObject=stream
       remoteVideoRef.current.muted=false
       remoteVideoRef.current.volume=0.75
       remoteVideoRef.current.playsInline=true
       void remoteVideoRef.current.play().catch(()=>{})
     }
   }
   pc.onconnectionstatechange=()=>{
     if(pc.connectionState==='connected') setRoomStatus('🟢 Cámaras conectadas. ¡Batalla en vivo!')
     if(pc.connectionState==='failed') setRoomStatus('🔴 No se pudo conectar la cámara del rival. Intenta reiniciar la batalla.')
   }
   return pc
 }
 async function startCamera(){
   try{
     if(!navigator.mediaDevices?.getUserMedia){setRoomStatus('Este navegador no permite usar la cámara. Abre AURA BATTLE con HTTPS en Chrome o Safari.');return}
     if(localStreamRef.current){cameraSourceRef.current=tab==='ai'?'ai':'battle';attachLocalStream(localStreamRef.current);setCameraOn(true);if(!socket.connected)socket.connect();socket.emit('camera-ready');return}
     setRoomStatus('Solicitando acceso a cámara y micrófono…')
     const videoConstraints={facingMode:{ideal:'user'},width:{ideal:720},height:{ideal:1280},frameRate:{ideal:30,max:30}}
     let s:MediaStream
     let micAvailable=true
     try{
       s=await navigator.mediaDevices.getUserMedia({video:videoConstraints,audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})
     }catch(firstError){
       console.warn('Camera + microphone request failed; trying camera only',firstError)
       try{
         s=await navigator.mediaDevices.getUserMedia({video:videoConstraints,audio:false})
         micAvailable=false
       }catch(videoError){
         console.warn('Preferred video constraints failed; trying basic camera',videoError)
         try{
           s=await navigator.mediaDevices.getUserMedia({video:true,audio:false})
           micAvailable=false
         }catch(finalError){
           throw finalError
         }
       }
     }
     cameraSourceRef.current=tab==='ai'?'ai':'battle'
     attachLocalStream(s)
     setCameraOn(true)
     if(!socket.connected)socket.connect()
     await preparePeer()
     socket.emit('camera-ready')
     if(micAvailable) setRoomStatus(opponentJoined?'Cámara y micrófono activos. Esperando que ambas cámaras estén listas…':'Cámara y micrófono activos. Esperando al rival…')
     else setRoomStatus(opponentJoined?'📷 Cámara activa. El micrófono no está disponible, pero puedes continuar.':'📷 Cámara activa. El micrófono no está disponible, pero puedes continuar.')
   }catch(error){
     console.error('Camera error',error)
     const name=(error as DOMException)?.name
     if(name==='NotAllowedError'||name==='PermissionDeniedError') setRoomStatus('❌ No se pudo acceder a la cámara. Revisa que Firefox/Chrome tenga permitido usar la Cámara para aura-battle-naol.onrender.com.')
     else if(name==='NotReadableError'||name==='TrackStartError') setRoomStatus('❌ La cámara está siendo usada por otra aplicación. Ciérrala y vuelve a intentarlo.')
     else if(name==='NotFoundError'||name==='DevicesNotFoundError') setRoomStatus('❌ No se encontró una cámara disponible en este teléfono.')
     else if(name==='OverconstrainedError'||name==='ConstraintNotSatisfiedError') setRoomStatus('❌ La cámara de este teléfono no admite la configuración solicitada. Vuelve a intentarlo.')
     else setRoomStatus('❌ No pudimos iniciar la cámara. Revisa los permisos del navegador y vuelve a intentarlo.')
   }
 }
 async function startBattle(){
   safetyViolationRef.current=false
   if(battleReady){setRoomStatus('⏳ Ya estás listo. Esperando que el rival confirme.');return}
   if(!opponentJoined||!cameraOn||!bothCamerasReady){setRoomStatus('🎥 Espera a que las dos cámaras estén activas antes de marcarte como listo.');return}
   if(!poseLandmarkerRef.current){setRoomStatus('🧠 La IA de movimiento todavía está cargando. Espera unos segundos e inténtalo de nuevo.');return}
   movementScoreRef.current=0;previousPoseRef.current=null;poseHistoryRef.current=[];poseFrameCountRef.current=0;poseVisibleFrameCountRef.current=0;lastMoveAtRef.current=0;patternScoreRef.current=0;lastMoveBonusRef.current=0;setAura(0);setMoveBonus(0);setDetectedMove('Esperando movimiento…')
   setBattleReady(true)
   setRoomStatus('⏳ ¡Estás listo! Esperando que el rival también pulse LISTO…')
   socket.emit('battle-ready')
 }
 async function sendChat(e:FormEvent){e.preventDefault();const text=chatInput.trim();if(!text||!user)return;setChatMsg('');setChatInput('');try{await addDoc(collection(db,'chat'),{uid:user.uid,name:user.displayName||'Jugador',text,createdAt:serverTimestamp()})}catch(error){console.error('Global chat send error:',error);setChatInput(text);setChatMsg('⚠️ No se pudo enviar el mensaje. Revisa tu conexión e inicia sesión de nuevo si es necesario.')}}
 async function searchFriends(){
  const term=friendSearch.trim().toLowerCase().replace(/\s+/g,' ')
  setFriendMsg('')
  setFriendResults([])
  if(!term){setFriendMsg('Escribe el nombre del jugador que quieres buscar.');return}
  if(!user){setFriendMsg('⚠️ Debes iniciar sesión para buscar jugadores.');return}
  setFriendSearching(true)
  try{
    const snap=await getDocs(collection(db,'users'))
    const results=snap.docs
      .filter(d=>d.id!==user.uid)
      .map(d=>{
        const x=d.data() as any
        const name=String(x.nombre||x.name||x.displayName||'Jugador')
        const email=String(x.email||'')
        const lower=String(x.nombreLower||name).toLowerCase().replace(/\s+/g,' ')
        return{id:d.id,name,aura:Number(x.aura||0),email,lower}
      })
      .filter(x=>x.lower.includes(term)||x.name.toLowerCase().replace(/\s+/g,' ').includes(term)||x.email.toLowerCase().includes(term))
      .slice(0,20)
    setFriendResults(results.map(({id,name,aura})=>({id,name,aura})))
    setFriendMsg(results.length?`✅ ${results.length} jugador(es) encontrado(s).`:`🔎 No encontramos jugadores con “${friendSearch.trim()}”.`)
  }catch(error:any){
    console.error('Friend search error:',error)
    setFriendMsg(`❌ Error al buscar: ${error?.code||error?.message||'permiso o conexión'}`)
  }finally{
    setFriendSearching(false)
  }
 }
 async function addFriend(f:Friend){
  if(!user)return
  if(friends.some(x=>x.id===f.id)){setFriendMsg(`🤝 ${f.name} ya está en tus amigos.`);return}
  try{
    const requestId=`${user.uid}_${f.id}`
    await setDoc(doc(db,'friendRequests',requestId),{
      senderId:user.uid,
      senderName:user.displayName||'Jugador',
      senderAura:Number(profile.aura||0),
      receiverId:f.id,
      status:'pending',
      createdAt:serverTimestamp()
    },{merge:true})
    setFriendMsg(`📨 Solicitud enviada a ${f.name}.`)
    void sendPushEvent(f.id,'friend_request',requestId)
  }catch(error:any){
    console.error('Friend request error:',error)
    setFriendMsg(`❌ No se pudo enviar la solicitud${error?.code?` (${error.code})`:''}.`)
  }
 }
 async function acceptFriendRequest(r:FriendRequest){
  if(!user)return
  try{
    const pairId=[user.uid,r.senderId].sort().join('_')
    await setDoc(doc(db,'friendships',pairId),{participants:[user.uid,r.senderId],createdAt:serverTimestamp()},{merge:true})
    await deleteDoc(doc(db,'friendRequests',r.id))
    const fs=await getDoc(doc(db,'users',r.senderId))
    const x=fs.exists()?fs.data():{}
    const friend:Friend={id:r.senderId,name:String(x.nombre||x.name||x.displayName||r.senderName||'Jugador'),aura:Number(x.aura||r.senderAura||0)}
    setFriends(v=>v.some(f=>f.id===friend.id)?v:[...v,friend])
    setFriendMsg(`🤝 ${friend.name} ahora es tu amigo.`)
  }catch(error:any){
    console.error('Accept friend request error:',error)
    setFriendMsg(`❌ No se pudo aceptar la solicitud${error?.code?` (${error.code})`:''}.`)
  }
 }
 async function rejectFriendRequest(r:FriendRequest){
  try{
    await deleteDoc(doc(db,'friendRequests',r.id))
    setFriendMsg('Solicitud rechazada.')
  }catch(error){
    console.error('Reject friend request error:',error)
    setFriendMsg('❌ No se pudo rechazar la solicitud.')
  }
 }
 async function runFirebaseDiagnostic(){
  if(!user)return
  setFirebaseDiagBusy(true); setFirebaseDiag('🔎 Comprobando Firebase…')
  try{
    const snap=await getDoc(doc(db,'users',user.uid))
    setFirebaseDiag(snap.exists()?'✅ Firebase/Firestore responde correctamente para tu usuario.':'⚠️ Firebase responde, pero no existe tu documento users/'+user.uid+'.')
  }catch(error:any){
    console.error('Firebase diagnostic error:',error)
    const code=error?.code||'sin-codigo'
    setFirebaseDiag(`❌ Firestore rechazó la operación (${code}). Esto indica un problema de reglas/permisos en Firebase, no de Render.`)
  }finally{setFirebaseDiagBusy(false)}
 }
 const conversationId=(a:string,b:string)=>[a,b].sort().join('_')
 async function removeFriend(f:Friend){
  if(!user)return
  const ok=window.confirm(`¿Eliminar a ${f.name} de tus amigos?`);
  if(!ok)return
  try{
    const pairId=[user.uid,f.id].sort().join('_')
    await deleteDoc(doc(db,'friendships',pairId))
    setFriends(prev=>prev.filter(x=>x.id!==f.id))
    if(privateFriend?.id===f.id){setPrivateFriend(null);setPrivateChat([])}
    setFriendMsg(`👋 ${f.name} fue eliminado de tus amigos.`)
  }catch(error:any){
    console.error('Remove friend error:',error)
    setFriendMsg(`❌ No se pudo eliminar a ${f.name}${error?.code?` (${error.code})`:''}.`)
  }
 }
 function openPrivateChat(f:Friend){if(user)localStorage.setItem(`auraPrivateRead:${user.uid}:${f.id}`,String(Date.now()));setUnreadPrivateMessages(prev=>prev.filter(m=>m.uid!==f.id));setNotificationOpen(false);setPrivateFriend(f);setPrivateInput('');setPrivateMsg('');navigateTab('chat');window.setTimeout(()=>privateInputRef.current?.focus(),120)}
 useEffect(()=>{if(!user||!privateFriend){setPrivateChat([]);return}setPrivateLoading(true);setPrivateMsg('');const cid=conversationId(user.uid,privateFriend.id);const q=query(collection(db,'privateChats'),where('participants','array-contains',user.uid),limit(200));return onSnapshot(q,s=>{const rows=s.docs.map(d=>({id:d.id,...d.data()} as ChatMsg)).filter(m=>m.conversationId===cid&&m.type!=='battleInvite');rows.sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0));setPrivateChat(rows);setPrivateLoading(false)},e=>{console.error('Private chat load error:',e);setPrivateLoading(false);setPrivateMsg(`⚠️ No se pudo cargar el chat con este amigo${e?.code?` (${e.code})`:''}.`)})},[user,privateFriend])
 useEffect(()=>{
  if(!user||!privateFriend||!privateChat.length)return
  const latest=privateChat[privateChat.length-1]
  const latestMs=latest?.createdAt?.toMillis?.()||((latest?.createdAt?.seconds||0)*1000)||Date.now()
  localStorage.setItem(`auraPrivateRead:${user.uid}:${privateFriend.id}`,String(latestMs))
  setUnreadPrivateMessages(prev=>prev.filter(m=>m.uid!==privateFriend.id))
 },[user,privateFriend,privateChat])
 useEffect(()=>{
  if(!privateFriend)return;
  const id=window.setTimeout(()=>{
    const mobile=window.matchMedia('(max-width: 700px)').matches;
    privateChatEndRef.current?.scrollIntoView({behavior:'smooth',block:mobile?'center':'end'});
  },80);
  return()=>window.clearTimeout(id)
},[privateChat,privateFriend])

useEffect(()=>{
  if(!privateFriend)return;
  const input=document.querySelector('.private-chat-form input') as HTMLInputElement|null;
  if(!input)return;
  const vv=window.visualViewport;
  const keepChatVisible=()=>{
    window.setTimeout(()=>input.scrollIntoView({behavior:'smooth',block:'center'}),60);
  };
  input.addEventListener('focus',keepChatVisible);
  vv?.addEventListener('resize',keepChatVisible);
  return()=>{input.removeEventListener('focus',keepChatVisible);vv?.removeEventListener('resize',keepChatVisible)}
},[privateFriend])
 async function sendPrivateChat(e:FormEvent){
  e.preventDefault();
  const text=privateInput.trim();
  if(!text||!user||!privateFriend)return;
  setPrivateMsg('');
  setPrivateInput('');
  window.setTimeout(()=>privateInputRef.current?.focus(),0);
  try{
    const messageRef=await addDoc(collection(db,'privateChats'),{uid:user.uid,name:user.displayName||'Jugador',text,conversationId:conversationId(user.uid,privateFriend.id),participants:[user.uid,privateFriend.id],createdAt:serverTimestamp()})
    void sendPushEvent(privateFriend.id,'private_message',messageRef.id)
    window.setTimeout(()=>privateInputRef.current?.focus(),30);
  }catch(error){
    console.error('Private chat send error:',error);
    setPrivateInput(text);
    setPrivateMsg('⚠️ No se pudo enviar el mensaje. Revisa tu conexión.');
    window.setTimeout(()=>privateInputRef.current?.focus(),30);
  }
 }
 async function inviteBattleWithFriend(f:Friend){
  if(!user)return
  if(!friends.some(x=>x.id===f.id)){setPrivateMsg('⚠️ Solo puedes invitar a una batalla a un amigo.');return}
  try{
    setPrivateMsg(`⚔️ Creando sala para ${f.name}…`)
    hostRef.current=true
    await resetPeer()
    if(!socket.connected)socket.connect()
    socket.emit('create',async(r:any)=>{
      if(!r?.ok){setPrivateMsg(r?.error||'⚠️ No se pudo crear la sala.');return}
      const code=String(r.code||'').toUpperCase()
      if(code.length!==6){setPrivateMsg('⚠️ El servidor devolvió un código de sala inválido.');return}
      setRoomCode(code);setRoom('');setHost(true);hostRef.current=true;setOpponentJoined(false);setRoomStatus(`⚔️ Invitación enviada a ${f.name}. Esperando que entre…`)
      try{
        const battleInviteRef=await addDoc(collection(db,'battleInvites'),{senderId:user.uid,senderName:user.displayName||'Jugador',receiverId:f.id,roomCode:code,status:'pending',createdAt:serverTimestamp()})
        void sendPushEvent(f.id,'battle_invite',battleInviteRef.id)
        setPrivateMsg(`⚔️ Invitación enviada a ${f.name}. Le llegará a sus notificaciones y podrá entrar directamente.`)
        navigateTab('battle')
      }catch(error:any){
        console.error('Battle invite error:',error)
        setPrivateMsg(`⚠️ No se pudo enviar la invitación${error?.code?` (${error.code})`:''}. Publica también firestore.rules de v5.160.`)
      }
    })
  }catch(error){console.error('Create battle invite room error:',error);setPrivateMsg('⚠️ No se pudo preparar la batalla.')}
 }
 async function acceptBattleInvite(invite:BattleInvite){
  if(!user)return
  setNotificationOpen(false)
  setRoomStatus(`⚔️ Entrando a la sala de ${invite.senderName||'tu amigo'}…`)
  try{
    await updateDoc(doc(db,'battleInvites',invite.id),{status:'accepted'})
    setBattleInvites(prev=>prev.filter(x=>x.id!==invite.id))
    joinRoomCode(invite.roomCode)
  }catch(error:any){
    console.error('Accept battle invite error:',error)
    setRoomStatus(`⚠️ No se pudo aceptar la invitación${error?.code?` (${error.code})`:''}.`)
  }
 }
 async function declineBattleInvite(invite:BattleInvite){
  if(!user)return
  try{
    await updateDoc(doc(db,'battleInvites',invite.id),{status:'declined'})
    setBattleInvites(prev=>prev.filter(x=>x.id!==invite.id))
    setNotificationOpen(false)
    setRoomStatus('Invitación rechazada.')
  }catch(error:any){
    console.error('Decline battle invite error:',error)
    setRoomStatus(`⚠️ No se pudo rechazar la invitación${error?.code?` (${error.code})`:''}.`)
  }
 }
 function buildClanTag(name:string){
  const clean=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 ]/g,' ').trim().toUpperCase();
  if(!clean)return '';
  const words=clean.split(/\s+/).filter(Boolean);
  const initials=words.map(w=>w[0]).join('');
  const base=(initials.length>=2?initials:clean.replace(/\s/g,'').slice(0,3)).slice(0,3);
  return base.padEnd(2,'X');
 }
 async function reserveClanTag(base:string){
  for(let n=0;n<=999;n++){
    const tag=n===0?base:`${base}${n}`;
    if(tag.length>6)continue;
    try{
      const existing=await getDocs(query(collection(db,'clans'),where('tag','==',tag),limit(1)));
      if(!existing.empty)continue;
      const tagRef=doc(db,'clanTags',tag);
      const reserved=await runTransaction(db,async tx=>{
        const snap=await tx.get(tagRef);
        if(snap.exists())return false;
        tx.set(tagRef,{tag,createdAt:serverTimestamp()});
        return true;
      });
      if(reserved)return tag;
    }catch(error:any){
      if(error?.code==='aborted'||error?.code==='failed-precondition')continue;
      throw error;
    }
  }
  throw new Error('clan-tag-exhausted');
 }
 async function createClan(){
  if(!user)return
  const name=clanName.trim(); const description=clanDescription.trim();
  if(myClanId){setClanMsg('⚠️ Ya perteneces a un clan.');return}
  if(name.length<3){setClanMsg('⚠️ El nombre del clan debe tener al menos 3 caracteres.');return}
  if(description.length>160){setClanMsg('⚠️ La descripción no puede superar 160 caracteres.');return}
  if(profile.aura<100){setClanMsg('⚡ Necesitas 100 Aura para crear un clan.');return}
  try{
    const base=buildClanTag(name);
    const tag=await reserveClanTag(base);
    const batch=writeBatch(db); const clanRef=doc(collection(db,'clans')); const userRef=doc(db,'users',user.uid); const tagRef=doc(db,'clanTags',tag);
    batch.set(clanRef,{name,tag,nameLower:name.toLowerCase(),tagLower:tag.toLowerCase(),description,visibility:clanVisibility,owner:user.uid,members:[user.uid],createdAt:serverTimestamp()});
    batch.update(userRef,{aura:increment(-100)});
    batch.update(tagRef,{clanId:clanRef.id,owner:user.uid});
    await batch.commit();
    setProfile(prev=>({...prev,aura:Math.max(0,prev.aura-100)})); setClanName('');setClanTag('');setClanDescription('');setClanVisibility('public');setClanMsg(`✅ Clan creado correctamente. Etiqueta automática: [${tag}]. Gastaste 100 Aura.`);
  }catch(error:any){console.error('Create clan error:',error);setClanMsg(`❌ No se pudo crear el clan${error?.message==='clan-tag-exhausted'?' porque se agotaron las etiquetas disponibles.':error?.code?` (${error.code})`:''}.`)}
 }
 async function requestToJoinClan(clan:Clan){
  if(!user)return
  if(clan.members?.includes(user.uid)){setClanMsg('ℹ️ Ya perteneces a este clan.');return}
  if(myClanId){setClanMsg('⚠️ Ya perteneces a un clan. Sal de tu clan actual antes de solicitar otro.');return}
  const requestId=`${clan.id}_${user.uid}`; const ref=doc(db,'clanJoinRequests',requestId)
  try{
    const snap=await getDoc(ref)
    if(snap.exists()){
      const status=String(snap.data().status||'')
      if(status==='pending'){setClanMsg('ℹ️ Ya tienes una solicitud pendiente para este clan.');return}
      if(status==='accepted'){
        // Una solicitud aceptada es histórica. Si el jugador ya salió del clan,
        // no debe bloquear una nueva solicitud de ingreso.
        const freshClan=await getDoc(doc(db,'clans',clan.id))
        const freshMembers=freshClan.exists()&&Array.isArray(freshClan.data().members)?freshClan.data().members:[]
        if(freshMembers.includes(user.uid)){setClanMsg('ℹ️ Ya formas parte de este clan.');return}
        await deleteDoc(ref)
      } else {
        await deleteDoc(ref)
      }
    }
    // Escritura simple y determinista: la regla CREATE de clanJoinRequests
    // solo necesita validar que requesterId coincida con el usuario autenticado.
    await setDoc(ref,{clanId:String(clan.id),requesterId:String(user.uid),requesterName:String(user.displayName||'Jugador'),clanName:String(clan.name||''),status:'pending',createdAt:serverTimestamp()})
    void Promise.all([clan.owner, clan.coLeader].filter((id): id is string=>!!id&&id!==user.uid).map(id=>sendPushEvent(id,'clan_join_request',requestId)))
    setClanMsg(`✅ Solicitud enviada a [${clan.tag||'CLAN'}] ${clan.name}.`)
  }catch(error:any){
    console.error('Join clan request error:',error)
    const code=error?.code||''
    setClanMsg(`❌ No se pudo enviar la solicitud${code?` (${code})`:''}.`)
  }
 }
 async function approveClanRequest(r:ClanJoinRequest){
  if(!user||!selectedClan)return
  const isLeader=selectedClan.owner===user?.uid; const isCoLeader=selectedClan.coLeader===user.uid
  if(!isLeader&&!isCoLeader)return
  try{await runTransaction(db,async tx=>{const clanRef=doc(db,'clans',selectedClan.id);const reqRef=doc(db,'clanJoinRequests',r.id);const clanSnap=await tx.get(clanRef);const reqSnap=await tx.get(reqRef);if(!clanSnap.exists()||!reqSnap.exists())throw new Error('request-missing');const clan=clanSnap.data();const req=reqSnap.data();const admin=clan.owner===user.uid||clan.coLeader===user.uid;if(!admin||req.status!=='pending'||req.kind==='invite')throw new Error('not-allowed');const members=Array.isArray(clan.members)?[...clan.members]:[];if(!members.includes(req.requesterId))members.push(req.requesterId);tx.update(clanRef,{members});tx.update(reqRef,{status:'accepted',reviewedAt:serverTimestamp()})});setClanMsg(`✅ ${r.requesterName||'Jugador'} se unió al clan.`)}catch(error:any){console.error('Approve clan request error:',error);setClanMsg(`❌ No se pudo aprobar la solicitud${error?.message?` (${error.message})`:error?.code?` (${error.code})`:''}.`)}
 }
 async function rejectClanRequest(r:ClanJoinRequest){
  if(!user||!selectedClan)return
  const isLeader=selectedClan.owner===user?.uid; const isCoLeader=selectedClan.coLeader===user.uid
  if(!isLeader&&!isCoLeader)return
  try{await updateDoc(doc(db,'clanJoinRequests',r.id),{status:'rejected',reviewedAt:serverTimestamp()});setClanMsg(`Solicitud de ${r.requesterName||'Jugador'} rechazada.`)}catch(error:any){console.error('Reject clan request error:',error);setClanMsg(`❌ No se pudo rechazar la solicitud${error?.code?` (${error.code})`:''}.`)}
 }
 async function setClanCoLeader(clan:Clan, memberId:string|null){
  if(!user||clan.owner!==user.uid)return
  if(memberId&&(!clan.members?.includes(memberId)||memberId===clan.owner)){setClanMsg('⚠️ El Co-líder debe ser un miembro del clan.');return}
  try{await updateDoc(doc(db,'clans',clan.id),{coLeader:memberId||null});setClanMsg(memberId?'🛡️ Co-líder asignado correctamente.':'🛡️ Co-líder removido.')}catch(error:any){console.error('Set co-leader error:',error);setClanMsg(`❌ No se pudo actualizar el Co-líder${error?.code?` (${error.code})`:''}.`)}
 }
 async function kickClanMember(clan:Clan, memberId:string){
  if(!user)return
  const admin=user.uid===clan.owner||user.uid===clan.coLeader
  if(!admin||memberId===clan.owner||memberId===clan.coLeader||memberId===user.uid)return
  try{
    const updates:any={members:arrayRemove(memberId)}
    if(clan.coLeader===memberId)updates.coLeader=null
    await updateDoc(doc(db,'clans',clan.id),updates)
    // Limpia una invitación pendiente antigua para que, si el jugador vuelve a ser invitado,
    // el botón no aparezca falsamente como "📨 Enviada".
    const inviteRef=doc(db,'clanJoinRequests',`${clan.id}_${memberId}`)
    const inviteSnap=await getDoc(inviteRef)
    if(inviteSnap.exists() && inviteSnap.data().status==='pending') await deleteDoc(inviteRef)
    setClanMsg('❌ Miembro expulsado del clan.')
  }catch(error:any){console.error('Kick clan member error:',error);setClanMsg(`❌ No se pudo expulsar al miembro${error?.code?` (${error.code})`:''}.`)}
 }
 async function transferClanLeadership(clan:Clan, memberId:string){
  if(!user||clan.owner!==user.uid||memberId===user.uid||!clan.members?.includes(memberId))return
  try{await updateDoc(doc(db,'clans',clan.id),{owner:memberId,coLeader:user.uid});setClanMsg('👑 Liderazgo transferido. Ahora eres Co-líder del clan.')}catch(error:any){console.error('Transfer leadership error:',error);setClanMsg(`❌ No se pudo transferir el liderazgo${error?.code?` (${error.code})`:''}.`)}
 }
 async function inviteFriendToClan(clan:Clan, friend:Friend){
  if(!user)return
  const admin=user.uid===clan.owner||user.uid===clan.coLeader
  if(!admin||clan.members?.includes(friend.id)||friend.id===user.uid)return
  if(clanInvitingFriendId===friend.id)return
  setClanInvitingFriendId(friend.id)
  const requestId=`${clan.id}_${friend.id}`; const ref=doc(db,'clanJoinRequests',requestId)
  try{
    const snap=await getDoc(ref)
    if(snap.exists()){
      const data=snap.data()
      if(data.status==='pending'&&data.kind==='invite'&&data.requesterId===user.uid&&data.receiverId===friend.id){
        setClanMsg(`ℹ️ Ya hay una invitación pendiente para ${friend.name}.`)
        return
      }
      await deleteDoc(ref)
    }
    const invite:ClanInvite={id:requestId,clanId:clan.id,senderId:user.uid,senderName:user.displayName||'Jugador',receiverId:friend.id,clanName:clan.name,clanTag:clan.tag||'',status:'pending',createdAt:serverTimestamp() as any}
    await setDoc(ref,{clanId:clan.id,requesterId:user.uid,requesterName:user.displayName||'Jugador',receiverId:friend.id,clanName:clan.name,kind:'invite',status:'pending',createdAt:serverTimestamp()})
    void sendPushEvent(friend.id,'clan_invite',requestId)
    setClanInvitesSent(prev=>[...prev.filter(x=>x.id!==requestId),invite])
    setClanMsg(`📨 Invitación enviada a ${friend.name}.`)
  }catch(error:any){
    console.error('Invite to clan error:',error)
    setClanMsg(`❌ No se pudo enviar la invitación${error?.code?` (${error.code})`:''}.`)
  }finally{
    setClanInvitingFriendId(null)
  }
 }
 async function acceptClanInvite(r:ClanInvite){
  if(!user)return
  try{
    const clanRef=doc(db,'clans',r.clanId); const reqRef=doc(db,'clanJoinRequests',r.id)
    const clanSnap=await getDoc(clanRef)
    if(!clanSnap.exists()){setClanMsg('⚠️ El clan ya no está disponible.');return}
    const clan=clanSnap.data()
    if(myClanId&&myClanId!==r.clanId){setClanMsg('⚠️ Ya perteneces a otro clan.');return}
    await runTransaction(db,async tx=>{
      const freshClan=await tx.get(clanRef); const reqSnap=await tx.get(reqRef)
      if(!freshClan.exists()||!reqSnap.exists())throw new Error('invite-missing')
      const data=freshClan.data(); const req=reqSnap.data()
      if(req.receiverId!==user.uid||req.status!=='pending')throw new Error('not-allowed')
      const members=Array.isArray(data.members)?[...data.members]:[]
      if(!members.includes(user.uid))members.push(user.uid)
      tx.update(clanRef,{members}); tx.update(reqRef,{status:'accepted',reviewedAt:serverTimestamp()})
    })
    setUnreadClanInvites(prev=>prev.filter(x=>x.id!==r.id)); localStorage.setItem(`auraClanInviteRead:${user.uid}:${r.id}`,'1'); setClanMsg(`✅ Te uniste a [${String(clan.tag||r.clanTag||'CLAN')}] ${String(clan.name||r.clanName||'Clan')}.`)
  }catch(error:any){console.error('Accept clan invite error:',error);setClanMsg(`❌ No se pudo aceptar la invitación${error?.code?` (${error.code})`:''}.`)}
 }
 async function declineClanInvite(r:ClanInvite){
  if(!user)return
  try{await updateDoc(doc(db,'clanJoinRequests',r.id),{status:'rejected',reviewedAt:serverTimestamp()});setUnreadClanInvites(prev=>prev.filter(x=>x.id!==r.id));localStorage.setItem(`auraClanInviteRead:${user.uid}:${r.id}`,'1');setClanMsg('Invitación de clan rechazada.')}catch(error:any){console.error('Decline clan invite error:',error);setClanMsg(`❌ No se pudo rechazar la invitación${error?.code?` (${error.code})`:''}.`)}
 }
 async function leaveClan(clan:Clan){
  if(!user)return
  if(clan.owner===user.uid){setClanMsg('👑 El Líder no puede salir. Primero transfiere el liderazgo a otro miembro.');return}
  if(!clan.members?.includes(user.uid))return
  try{const updates:any={members:arrayRemove(user.uid)}; if(clan.coLeader===user.uid)updates.coLeader=null; await updateDoc(doc(db,'clans',clan.id),updates);setSelectedClan(null);setClanMsg(`🚪 Has salido de [${clan.tag||'CLAN'}] ${clan.name}.`)}catch(error:any){console.error('Leave clan error:',error);setClanMsg(`❌ No se pudo salir del clan${error?.code?` (${error.code})`:''}.`)}
 }
 const pendingRequestForSelected=selectedClan?myClanRequests.find(r=>r.clanId===selectedClan.id&&r.status==='pending'&&r.kind!=='invite'):undefined
 const selectedClanIsAdmin=!!selectedClan&&(selectedClan.owner===user?.uid||selectedClan.coLeader===user?.uid)
 const selectedClanIsLeader=!!selectedClan&&selectedClan.owner===user?.uid
 const filteredClans=clanSearch.trim()? (clanSearchResults||[]) : clans

 if(!authReady)return <div className="auth-loading">⚡ AURA BATTLE<br/><small>Comprobando sesión…</small></div>
 if(!user)return <AuthScreen {...{authMode,setAuthMode,email,setEmail,password,setPassword,password2,setPassword2,name,setName,authMsg,setAuthMsg,handleAuth,resetPassword,resetSent,loginWithGoogle,lang,setLang,t,legalAccepted,setLegalAccepted,legalDoc,setLegalDoc}}/>
 return <div className={`app ${theme}`}><audio ref={battleMusicRef} src="/assets/audio/aura-battle-theme.wav" loop preload="auto" /><header className="topbar"><div className="brand">⚡ <span>Aura farming battles</span><b>V5.174.3</b></div><div className="top-actions"><span className="online-pill">● {online} {t.online}</span>{tab==='home'&&<div className="notification-wrap"><button type="button" className={`notification-btn${notificationOpen?' active':''}`} onClick={()=>setNotificationOpen(v=>!v)} aria-label="Notificaciones" title="Notificaciones">🔔{unreadFriendRequests.length+unreadPrivateMessages.length+battleInvites.length+unreadClanJoinRequests.length+unreadClanInvites.length>0&&<span className="notification-badge">{Math.min(99,unreadFriendRequests.length+unreadPrivateMessages.length+battleInvites.length+unreadClanJoinRequests.length+unreadClanInvites.length)}</span>}</button>{notificationOpen&&<div className="notification-panel"><div className="notification-title">🔔 Notificaciones</div>{battleInvites.length>0&&<div className="notification-messages"><div className="notification-subtitle">⚔️ Invitaciones de batalla</div>{battleInvites.slice(0,5).map(inv=><div className="notification-battle-invite" key={inv.id}><strong>{inv.senderName||'Jugador'} te invitó a una batalla</strong><div className="notification-battle-actions"><button type="button" className="primary" onClick={()=>void acceptBattleInvite(inv)}>⚔️ Aceptar</button><button type="button" onClick={()=>void declineBattleInvite(inv)}>Rechazar</button></div></div>)}</div>}{unreadFriendRequests.length>0&&<button type="button" className="notification-item" onClick={()=>{if(user)friendRequests.forEach(r=>localStorage.setItem(`auraFriendRequestRead:${user.uid}:${r.id}`,'1'));setUnreadFriendRequests([]);setNotificationOpen(false);navigateTab('friends')}}><strong>👥 {unreadFriendRequests.length} solicitud{unreadFriendRequests.length===1?'':'es'} de amistad</strong><small>Tienes nuevas solicitudes para revisar.</small></button>}{unreadPrivateMessages.length>0&&<div className="notification-messages"><div className="notification-subtitle">💬 Mensajes nuevos</div>{unreadPrivateMessages.slice(0,5).map(m=>{const f=friends.find(x=>x.id===m.uid);return <button type="button" className="notification-item" key={m.id} onClick={()=>f&&openPrivateChat(f)}><strong>{m.name||f?.name||'Jugador'}</strong><small>{m.text}</small></button>})}</div>}{unreadClanJoinRequests.length>0&&<div className="notification-messages"><div className="notification-subtitle">🛡️ Solicitudes de clan</div>{unreadClanJoinRequests.slice(0,5).map(r=><button type="button" className="notification-item clan-notification-item" key={r.id} onClick={()=>{localStorage.setItem(`auraClanJoinRead:${user.uid}:${r.id}`,'1');setUnreadClanJoinRequests(prev=>prev.filter(x=>x.id!==r.id));const c=clans.find(x=>x.id===r.clanId);if(c){setSelectedClan(c);setNotificationOpen(false);navigateTab('clans')}}}><strong>👥 {r.requesterName||'Jugador'} quiere unirse a tu clan</strong><small>{r.clanName||'Solicitud de ingreso'}</small></button>)}</div>}{unreadClanInvites.length>0&&<div className="notification-messages"><div className="notification-subtitle">📨 Invitaciones a clan</div>{unreadClanInvites.slice(0,5).map(r=><div className="notification-item clan-notification-item" key={r.id} onClick={()=>{localStorage.setItem(`auraClanInviteRead:${user.uid}:${r.id}`,'1')}}><strong>🛡️ {r.senderName||'Jugador'} te invitó a un clan</strong><small>{r.clanName||'Invitación de clan'}</small><div className="notification-battle-actions"><button type="button" className="primary" onClick={()=>void acceptClanInvite(r)}>Aceptar</button><button type="button" onClick={()=>void declineClanInvite(r)}>Rechazar</button></div></div>)}</div>}{unreadFriendRequests.length===0&&unreadPrivateMessages.length===0&&battleInvites.length===0&&unreadClanJoinRequests.length===0&&unreadClanInvites.length===0&&<div className="notification-empty">No tienes notificaciones nuevas.</div>}</div>}</div>}<select value={lang} onChange={e=>setLang(e.target.value as Lang)}><option value="es">ES</option><option value="en">EN</option><option value="pt">PT</option><option value="fr">FR</option><option value="de">DE</option><option value="it">IT</option><option value="tr">TR</option><option value="ja">JA</option><option value="ko">KO</option><option value="zh">中文</option></select><button onClick={logout}>{t.logout}</button></div></header>
 <div className="layout"><aside className="sidebar"><div className="mini-profile"><div className="profile-icon">⚡</div><div><strong>{user.displayName||'Jugador'}</strong><small>⚡ {profile.aura} Aura · Lv.{profile.level}</small></div></div>{nav.map(n=><button key={n} className={tab===n?'nav active':'nav'} onClick={()=>navigateTab(n)}>{icon(n)} {t[n]}</button>)}<div className="ad-slot side-ad">PUBLICIDAD<br/><small>Espacio para marcas</small></div></aside>
 <main className="content">
 {tab==='home'&&<section className="home-hero"><div className="hero-copy"><div className="eyebrow">⚡ ONLINE AURA ARENA</div><h1>{t.welcome}</h1><p>Compite en vivo, gana Aura y construye tu reputación.</p><div className="hero-actions"><button className="primary" onClick={()=>navigateTab('battle')}>⚔️ {t.play}</button><button onClick={()=>navigateTab('profile')}>👤 Mi perfil</button></div><div className="quick-stats"><Stat label="⚡ Tu Aura" value={profile.aura}/><Stat label="🏆 Victorias" value={profile.wins}/><Stat label="🔥 Nivel" value={profile.level}/></div></div><div className="hero-art"><img src="/assets/aura-arena-home.png" alt="AURA BATTLE Arena"/><div className="hero-glow">LIVE</div></div><div className="home-grid"><Card icon="⚔️" title="Batallas 1v1" text="Crea una sala y reta a otra persona con cámara." action={()=>navigateTab('battle')}/><Card icon="🤖" title="IA Aura" text="Convierte señales visuales de tu cámara en una métrica de Aura." action={()=>navigateTab('ai')}/><Card icon="🏆" title="Ranking global" text="Sube posiciones con tus victorias y puntuación." action={()=>navigateTab('ranking')}/><Card icon="🛡️" title="Clanes" text="Forma equipos y crea una comunidad alrededor de tu Aura." action={()=>navigateTab('clans')}/></div><div className="ad-slot banner-ad">ESPACIO PUBLICITARIO · AURA BATTLE</div></section>}
 {tab==='profile'&&<Panel title="👤 Mi perfil"><div className="profile-head"><div className="big-profile-icon">⚡</div><div><h2>{user.displayName||'Jugador'}</h2><p>{user.email}</p><span className="badge">Nivel {profile.level}</span>{myRank&&<span className="badge" style={{marginLeft:8}}>🏆 #{myRank}</span>}</div></div><div className="progress-card"><div className="progress-top"><strong>⚡ Progreso de nivel</strong><span>{profile.level>=100?'NIVEL MÁXIMO':`${profile.aura%100}/100 Aura`}</span></div><div className="progress-track"><div className="progress-fill" style={{width:`${profile.level>=100?100:profile.aura%100}%`}}/></div><small>{profile.level>=100?'Has alcanzado el nivel máximo.':`Faltan ${100-(profile.aura%100)} Aura para el nivel ${profile.level+1}.`}</small></div><div className="stats"><Stat label="⚡ Aura" value={profile.aura}/><Stat label="⚔️ Batallas" value={profile.battles}/><Stat label="🏆 Victorias" value={profile.wins}/><Stat label="❌ Derrotas" value={profile.losses}/><Stat label="🤝 Empates" value={profile.draws}/><Stat label="📈 Ratio" value={`${profile.battles?Math.round(profile.wins/profile.battles*100):0}%`}/><Stat label="🔥 Racha actual" value={profile.currentStreak}/><Stat label="👑 Mejor racha" value={profile.bestStreak}/></div><div className="profile-earned"><span>💰 Aura ganada</span><strong>{profile.auraEarned}</strong></div><div className="profile-actions"><button className="primary" onClick={()=>navigateTab('battle')}>⚔️ Ir a batallar</button><button onClick={()=>navigateTab('ranking')}>🏆 Ver ranking</button><button onClick={()=>navigateTab('settings')}>⚙️ Ajustes</button></div>{publicProfile&&<div className="public-profile"><div><strong>👤 {publicProfile.name}</strong><small>⚡ {publicProfile.aura} Aura</small></div><button onClick={()=>setPublicProfile(null)}>Cerrar</button></div>}</Panel>}
 {tab==='friends'&&<Panel title={`👥 Amigos${friendRequests.length?` · 🔔 ${friendRequests.length}`:''}`}><p>Encuentra jugadores y añade rivales a tu red.</p>{friendRequests.length>0&&<div className="friend-requests"><div className="section-title">🔔 Solicitudes de amistad ({friendRequests.length})</div>{friendRequests.map(r=><div className="list-row friend-request-row" key={r.id}>🧑 <span><strong>{r.senderName}</strong><small>⚡ {r.senderAura} Aura · quiere ser tu amigo</small></span><div className="inline request-actions"><button className="primary" onClick={()=>acceptFriendRequest(r)}>✓ Aceptar</button><button onClick={()=>rejectFriendRequest(r)}>✕</button></div></div>)}</div>}<div className="inline"><input placeholder="Nombre del jugador" value={friendSearch} onChange={e=>setFriendSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchFriends()}/><button type="button" onClick={searchFriends} disabled={friendSearching}>{friendSearching?'⏳ Buscando…':'🔎 Buscar'}</button></div>{friendMsg&&<div className="notice">{friendMsg}</div>}{friendResults.length>0&&<div className="list">{friendResults.map(f=><div className="list-row" key={f.id}>🧑 <span>{f.name}<small>⚡ {f.aura}</small></span><button onClick={()=>addFriend(f)}>📨 Solicitar</button></div>)}</div>}<div className="section-title">Mis amigos</div><div className="list">{friends.length?friends.map(f=><div className="list-row" key={f.id}>🟢 <span>{f.name}<small>⚡ {f.aura}</small></span><div className="inline friend-actions"><button className="primary" onClick={()=>openPrivateChat(f)}>💬 Chat</button><button type="button" className="danger-btn" onClick={()=>removeFriend(f)} title="Eliminar amigo">🗑️</button></div></div>):<div className="empty">Todavía no tienes amigos. Busca un jugador arriba.</div>}</div></Panel>}
 {tab==='chat'&&<Panel title={privateFriend?`💬 Chat con ${privateFriend.name}`:'💬 Chat global'}>{privateFriend?<><button type="button" onClick={()=>{setPrivateFriend(null);setPrivateChat([])}}>← Chat global</button><div className="private-chat-head">🟢 {privateFriend.name}<small>⚡ {privateFriend.aura} Aura</small><button type="button" className="battle-invite-btn" onClick={()=>void inviteBattleWithFriend(privateFriend)}>⚔️ Invitar a batalla</button></div>{battleInvites.filter(inv=>inv.senderId===privateFriend.id&&inv.receiverId===user.uid).map(inv=><div className="private-battle-notice" key={inv.id}><strong>⚔️ {inv.senderName||privateFriend.name} te invitó a una batalla</strong><span>La sala está lista. Puedes entrar directamente.</span><div className="notification-battle-actions"><button type="button" className="primary" onClick={()=>void acceptBattleInvite(inv)}>⚔️ Aceptar</button><button type="button" onClick={()=>void declineBattleInvite(inv)}>Rechazar</button></div></div>)}<div className="chat-box private-chat-box">{privateChat.length?privateChat.map(m=><div className={m.uid===user.uid?'bubble mine':'bubble'} key={m.id}><strong>{m.name}:</strong><span> {m.text}</span></div>):<div className="empty">{privateLoading?'Cargando conversación…':'Todavía no hay mensajes. ¡Saluda a tu amigo!'}</div>}<div ref={privateChatEndRef} className="chat-scroll-anchor" aria-hidden="true" /></div><form className="inline private-chat-form" onSubmit={sendPrivateChat}><input ref={privateInputRef} maxLength={300} value={privateInput} onChange={e=>setPrivateInput(e.target.value)} placeholder={`Escribe a ${privateFriend.name}…`}/><button className="primary" type="submit" disabled={!privateInput.trim()||privateLoading} onPointerDown={e=>e.preventDefault()}>Enviar</button></form>{privateMsg&&<div className="notice">{privateMsg}</div>}<small className="small">Chat privado entre amigos. Solo ustedes dos pueden verlo.</small></>:<><div className="chat-box">{chat.length?chat.map(m=><div className={m.uid===user.uid?'bubble mine':'bubble'} key={m.id}><strong>{m.name}:</strong><span> {m.text}</span></div>):<div className="empty">Sé la primera persona en escribir.</div>}</div><form className="inline" onSubmit={sendChat}><input maxLength={300} value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Escribe un mensaje…"/><button className="primary" type="submit" disabled={!chatInput.trim()||chatLoading} onPointerDown={e=>e.preventDefault()}>Enviar</button></form>{chatMsg&&<div className="notice">{chatMsg}</div>}<small className="small">Chat público de la comunidad. No compartas datos personales.</small></>}</Panel>}
 {tab==='battle'&&<Panel title="⚔️ Batallas 1v1">{battleResult?<div className={`battle-result-card ${battleResult.outcome}`}>
   <div className="battle-result-icon">{battleResult.outcome==='win'?'🏆':battleResult.outcome==='loss'?'💥':'🤝'}</div>
   <div className="battle-result-label">RESULTADO FINAL</div>
   <h2>{battleResult.outcome==='win'?'¡GANASTE!':battleResult.outcome==='loss'?'¡PERDISTE!':'¡EMPATE!'}</h2>
   <p className="battle-result-sub">{battleResult.outcome==='draw'?'Ambos jugadores obtienen +10 Aura.':battleResult.outcome==='win'?'+25 Aura para ti.':'+5 Aura para ti.'}</p>
   <div className="battle-scoreboard"><div><span>TÚ</span><strong>⚡ {battleResult.localScore}</strong><small>{battleResult.outcome==='win'?'GANADOR':battleResult.outcome==='draw'?'EMPATE':'DERROTA'}</small></div><div className="score-vs">VS</div><div><span>RIVAL</span><strong>⚡ {battleResult.rivalScore}</strong><small>{battleResult.outcome==='loss'?'GANADOR':battleResult.outcome==='draw'?'EMPATE':'DERROTA'}</small></div></div>
   <button className="primary result-home-btn" onClick={returnToHome}>← Volver al inicio</button>
 </div>:<><div className="battle-intro"><div><h2>Entra a la arena</h2><p>Crea una sala y comparte el código con tu rival, o únete a una sala existente.</p></div><div className="live-dot">● LIVE</div></div><div className="room-card">{!roomCode?<div className="room-actions"><button className="primary" onClick={createRoom}>{t.create}</button><span>o</span><input maxLength={6} placeholder={t.code} value={room} onChange={e=>setRoom(e.target.value.toUpperCase())}/><button onClick={joinRoom}>{t.join}</button></div>:<><div className="room-code">{roomCode}</div><button className="copy-btn" onClick={()=>navigator.clipboard?.writeText(roomCode)}>📋 Copiar código</button><div className="status">{roomStatus}</div><div className="battle-actions"><button onClick={startCamera}>📷 {cameraOn?'CÁMARA ACTIVA':'ACTIVAR CÁMARA'}</button><button className="primary" disabled={!opponentJoined||!cameraOn||!bothCamerasReady||!poseReady||battleStarted} onClick={startBattle}>🔥 {battleStarted?'BATALLA EN CURSO':!poseReady?'CARGANDO IA…':battleReady?'⏳ LISTO — ESPERANDO RIVAL':opponentReady?'⚔️ RIVAL LISTO · YO TAMBIÉN':'✓ ESTOY LISTO'}</button>{battleStarted&&<button onClick={finishBattle}>🏁 Terminar y guardar resultado</button>}</div></>}</div><div className="video-grid"><VideoCard title={user.displayName||'Jugador 1'} videoRef={videoRef} score={aura} muted/><VideoCard title="Rival" videoRef={remoteVideoRef} score={opponentAura}/></div>{battleCountdown>0&&<div className="battle-countdown"><small>LA BATALLA COMIENZA EN</small><strong>{battleCountdown}</strong><span>⚡ Prepárate para ganar Aura</span></div>}{battleStarted&&<div className="battle-banner"><div>🧠 IA ANALIZANDO · ⏱️ {battleSeconds}s · ⚡ {aura} Aura</div><div className="move-detection">{detectedMove}{moveBonus>0&&<span> +{moveBonus}</span>}</div> <button className="music-toggle" onClick={()=>setMusicOn(v=>!v)}>{musicOn?'🔊 Música':'🔇 Música'}</button></div>}</>}</Panel>}
 {tab==='ai'&&<Panel title="🤖 IA Aura"><div className="training-notice"><strong>🎯 ÁREA DE ENTRENAMIENTO</strong><span>Entrena durante 15 segundos con la IA de movimiento y mejora tu control.</span><small>🏆 Cada entrenamiento completado otorga <b>+1 Aura</b>.</small></div><div className="ai-camera-card"><div className="ai-camera-frame"><video ref={aiVideoRef} autoPlay playsInline muted/>{!cameraOn&&<div className="ai-camera-placeholder">📷<span>Activa tu cámara para entrenar y medir tu Aura</span></div>}<div className="ai-camera-badge">{cameraOn?'● CÁMARA ACTIVA':'● CÁMARA INACTIVA'}</div>{cameraOn&&<div className="ai-aura-overlay"><span>⚡ AURA</span><b>{aura}</b></div>}</div><div className="ai-aura-label">⚡ Aura detectada: <strong>{aura}</strong></div><div className="ai-meter"><div className="meter-fill" style={{width:`${aura}%`}}/></div></div><div className="ai-hero"><div><h2>{trainingActive?'Entrenamiento en curso':'Tu Aura de entrenamiento'}</h2><div className="aura-number">{trainingActive?trainingSeconds:aura}</div><p>{trainingActive?`Mantén tus movimientos durante ${trainingSeconds} segundos.`:'La IA analiza tus movimientos corporales localmente.'}</p></div><div className="ai-orb">⚡</div></div><div className="ai-training-actions"><button className="primary" onClick={startCamera} disabled={trainingActive}>{cameraOn?'✓ Cámara conectada':'📷 Activar cámara'}</button><button className="primary" onClick={()=>{if(!cameraOn){setRoomStatus('📷 Activa primero la cámara.');return}if(!poseLandmarkerRef.current){setRoomStatus('🧠 La IA todavía está cargando. Espera unos segundos.');return}movementScoreRef.current=0;previousPoseRef.current=null;poseHistoryRef.current=[];poseFrameCountRef.current=0;poseVisibleFrameCountRef.current=0;setAura(0);setTrainingDone(false);setTrainingSeconds(15);setTrainingActive(true);setRoomStatus('🧠 Entrenamiento iniciado. ¡15 segundos!')}} disabled={!cameraOn||trainingActive||!poseReady}> {trainingActive?`⏱️ ${trainingSeconds}s`:'🔥 INICIAR ENTRENAMIENTO'}</button></div>{trainingDone&&<div className="notice">🎉 ¡Entrenamiento completado! <strong>+1 Aura</strong> se añadió a tu perfil.</div>}<div className="notice">Consejo: buena iluminación, cuerpo visible y encuadre estable ayudan a obtener una señal más consistente.</div></Panel>}
 {tab==='ranking'&&<Panel title="🏆 Ranking global"><div className="ranking-my-position">{myRank?<>Tu posición actual: <strong>#{myRank}</strong></>:<>Estás fuera del Top 100 por ahora.</>}</div><div className="podium"><div>🥈 {leaders[1]?.name||'—'}<b>{leaders[1]?.aura||0}</b></div><div>🥇 {leaders[0]?.name||'—'}<b>{leaders[0]?.aura||0}</b></div><div>🥉 {leaders[2]?.name||'—'}<b>{leaders[2]?.aura||0}</b></div></div><div className="leader-list">{leaders.map((x,i)=><button className={`leader ${x.id===user.uid?'leader-me':''}`} key={x.id} onClick={()=>setPublicProfile(x)}><span>#{i+1} · {x.name}{x.id===user.uid?' · Tú':''}</span><b>⚡ {x.aura}</b></button>)}</div><small className="small">Toca un jugador para ver su resumen público.</small></Panel>}
 {tab==='league'&&<Panel title="🥇 Liga"><div className="league-card"><div className="league-badge">⚡</div><h2>Bronce</h2><p>Gana batallas para subir a Plata, Oro y las divisiones superiores.</p><div className="progress"><span style={{width:`${Math.min(100,(profile.wins*10)%101)}%`}}/></div><small>{profile.wins*10} / 100 puntos de ascenso</small></div><div className="three-col"><Stat label="Temporada" value="01"/><Stat label="Victorias" value={profile.wins}/><Stat label="Nivel" value={profile.level}/></div></Panel>}
 {tab==='clans'&&<Panel title="🛡️ Clanes">
   <div className="clan-create">
     <div className="section-title">🏰 Crear mi clan</div>
     <div className="clan-form-grid">
       <div className="clan-field"><label>Nombre del clan</label><input placeholder="Ej.: Guerreros del Aura" value={clanName} onChange={e=>{setClanName(e.target.value);setClanTag(buildClanTag(e.target.value));setClanMsg('')}}/></div>
       <div className="clan-field"><label>Etiqueta automática <small>(se genera con el nombre)</small></label><input className="clan-tag-input" value={clanTag||buildClanTag(clanName)} readOnly aria-readonly="true"/><small className="clan-field-help">Se genera con el nombre y nunca se repite.</small></div>
       <div className="clan-field clan-description-field"><label>Descripción del clan <small>(opcional)</small></label><textarea placeholder="Cuéntanos sobre tu clan…" maxLength={160} value={clanDescription} onChange={e=>setClanDescription(e.target.value)}/><small className="clan-counter">{clanDescription.length}/160</small></div>
       <div className="clan-field clan-visibility-field"><label>Visibilidad</label><select value={clanVisibility} onChange={e=>setClanVisibility(e.target.value as 'public'|'private')}><option value="public">🌎 Público</option><option value="private">🔒 Privado</option></select></div>
     </div>
     <div className="clan-create-foot"><small>⚡ Crear clan cuesta <strong>100 Aura</strong>. {myClanId?'Ya perteneces a un clan.':''}</small><button className="primary" onClick={()=>void createClan()} disabled={!!myClanId}>＋ Crear clan</button></div>
   </div>
   {clanMsg&&<div className="notice">{clanMsg}</div>}

   <div className="section-title">🔎 Buscar clanes</div>
   <div className="inline clan-search">
     <input placeholder="Buscar por nombre o etiqueta" value={clanSearch} onChange={e=>setClanSearch(e.target.value)} onKeyDown={e=>e.key==='Escape'&&setClanSearch('')}/>
     {clanSearch.trim()&&<button type="button" onClick={()=>setClanSearch('')} aria-label="Limpiar búsqueda">✕</button>}
   </div>
   {clanSearch.trim()&&<small className="clan-search-status">{clanSearching?'🔎 Buscando en la comunidad…':`${filteredClans.length} clan${filteredClans.length===1?' encontrado':'es encontrados'}.`}</small>}
   <div className="section-title clan-community-title">Clanes de la comunidad</div>
   <div className="clan-list">
     {filteredClans.length ? filteredClans.map(c=>(
       <div className="clan-card clan-card-v163" key={c.id}>
         <div><h3>{c.name}</h3><p className="clan-tag">[{c.tag||'CLAN'}] · {c.visibility==='private'?'🔒 Privado':'🌎 Público'}</p><p>{c.description||'Clan de la comunidad Aura farming battles.'}</p><small>👥 {c.members?.length||0} miembros</small></div>
         <button type="button" className="secondary clan-view-btn" onClick={()=>{setSelectedClan(c);setClanMsg('')}}>Ver clan</button>
       </div>
     )) : <div className="empty">No encontramos clanes con esa búsqueda.</div>}
   </div>

   {selectedClan&&<div className="clan-detail">
     <div className="clan-detail-head">
       <div><h2>[{selectedClan.tag||'CLAN'}] {selectedClan.name}</h2><p>{selectedClan.description||'Clan de la comunidad Aura farming battles.'}</p></div>
       <button type="button" onClick={()=>setSelectedClan(null)}>✕</button>
     </div>
     <div className="clan-detail-meta">
       <span>👥 {selectedClan.members?.length||0} miembros</span>
       <span>{selectedClan.visibility==='private'?'🔒 Privado':'🌎 Público'}</span>
       <span>{selectedClan.owner===user?.uid?'👑 Líder':selectedClan.coLeader===user?.uid?'🛡️ Co-líder':selectedClan.members?.includes(user.uid)?'⚔️ Miembro':'👤 Visitante'}</span>
     </div>

     {selectedClan.members?.includes(user.uid) ? <>
       <div className="clan-members">
         <h3>👥 Miembros</h3>
         {clanMembers.map(m=>(
           <div className="clan-member-row" key={m.id}>
             <span>{m.id===selectedClan.owner?'👑':m.id===selectedClan.coLeader?'🛡️':'⚔️'} {m.name}</span>
             <small>{m.id===selectedClan.owner?'Líder':m.id===selectedClan.coLeader?'Co-líder':'Miembro'} · ⚡ {m.aura}</small>
             {selectedClanIsLeader&&m.id!==selectedClan.owner&&m.id!==user.uid&&<div className="clan-member-actions">
               <button type="button" onClick={()=>void setClanCoLeader(selectedClan,selectedClan.coLeader===m.id?null:m.id)}>{selectedClan.coLeader===m.id?'Quitar Co-líder':'Nombrar Co-líder'}</button>
               <button type="button" onClick={()=>{if(window.confirm(`¿Expulsar a ${m.name} del clan?`))void kickClanMember(selectedClan,m.id)}}>Expulsar</button>
               <button type="button" onClick={()=>{if(window.confirm(`¿Transferir el liderazgo a ${m.name}? Tú quedarás como Co-líder.`))void transferClanLeadership(selectedClan,m.id)}}>Transferir liderazgo</button>
             </div>}
           </div>
         ))}
       </div>

       {selectedClanIsAdmin&&<div className="clan-admin-invite">
         <h3>➕ Invitar amigos al clan</h3>
         {friends.filter(f=>!selectedClan.members?.includes(f.id)).length ? friends.filter(f=>!selectedClan.members?.includes(f.id)).map(f=>{
           const sent=clanInvitesSent.some(r=>r.clanId===selectedClan.id&&r.receiverId===f.id&&r.status==='pending');
           const sending=clanInvitingFriendId===f.id;
           return <div className="clan-invite-row" key={f.id}><span>👤 {f.name}</span><button type="button" className={sent?'clan-invite-sent':''} disabled={sent||sending} onClick={()=>void inviteFriendToClan(selectedClan,f)}>{sending?'⏳ Enviando…':sent?'📨 Enviada':'➕ Invitar'}</button></div>;
         }) : <small>No tienes amigos disponibles para invitar.</small>}
       </div>}

       <div className="clan-chat-panel">
         <div className="clan-chat-head"><div><h3>💬 Chat del clan</h3><small>Solo los miembros del clan pueden participar.</small></div>{unreadClanChatCount>0&&<span className="clan-chat-unread">🔔 {unreadClanChatCount}</span>}</div>
         <div className="chat-box clan-chat-box">
           {clanChat.length ? clanChat.map(m=><div className={m.uid===user.uid?'bubble mine':'bubble'} key={m.id}><strong>{m.name}:</strong><span> {m.text}</span></div>) : <div className="empty">Todavía no hay mensajes. ¡Saluda al clan!</div>}
           <div className="chat-scroll-anchor" aria-hidden="true" />
         </div>
         <form className="inline clan-chat-form" onSubmit={sendClanChat}><input maxLength={300} value={clanChatInput} onChange={e=>setClanChatInput(e.target.value)} placeholder="Escribe al clan…"/><button className="primary" type="submit" disabled={!clanChatInput.trim()||clanChatLoading}>Enviar</button></form>
         {clanChatMsg&&<div className="notice">{clanChatMsg}</div>}
       </div>

       {selectedClan.owner===user.uid ? <div className="clan-leader-warning">👑 Eres el Líder. Para salir debes transferir primero el liderazgo.</div> : <button type="button" className="clan-leave-btn" onClick={()=>void leaveClan(selectedClan)}>🚪 Salir del clan</button>}
     </> : <div className="clan-join-box">
       {pendingRequestForSelected ? <div className="notice">⏳ Solicitud pendiente. El liderazgo debe aprobarla.</div> : <button type="button" className="primary" onClick={()=>void requestToJoinClan(selectedClan)} disabled={!!myClanId}>➕ Solicitar unirme al clan</button>}
       {myClanId&&<small>Ya perteneces a otro clan.</small>}
     </div>}

     {selectedClanIsAdmin&&<div className="clan-admin-requests">
       <h3>📨 Solicitudes de ingreso</h3>
       {clanJoinRequests.length ? clanJoinRequests.map(r=>(
         <div className="clan-request-row" key={r.id}>
           <div><strong>{r.requesterName||'Jugador'}</strong><small>Quiere unirse a tu clan.</small></div>
           <div className="clan-request-actions"><button type="button" className="primary" onClick={()=>void approveClanRequest(r)}>Aceptar</button><button type="button" onClick={()=>void rejectClanRequest(r)}>Rechazar</button></div>
         </div>
       )) : <div className="empty">No hay solicitudes pendientes.</div>}
     </div>}
   </div>}
 </Panel>}
 {tab==='premium'&&<Panel title="💎 Premium"><div className="premium-box"><div className="premium-icon">💎</div><h2>AURA BATTLE Premium</h2><p>Beneficios previstos: cosméticos exclusivos, estadísticas avanzadas, insignias y experiencia sin publicidad.</p><div className="premium-list"><span>✓ Efectos y beneficios exclusivos</span><span>✓ Estadísticas avanzadas</span><span>✓ Insignia Premium</span><span>✓ Sin publicidad</span></div><button className="primary" onClick={()=>setPremium(v=>!v)}>{premium?'✓ Premium demo activado':'Ver beneficios'}</button></div><div className="notice">Los pagos reales todavía no están activados. Antes de cobrar, conectaremos un proveedor de pagos y políticas legales.</div></Panel>}
 {tab==='settings'&&<Panel title="⚙️ Ajustes"><div className="section-title">🔔 Notificaciones</div><p>Activa las notificaciones de Aura farming battles en este dispositivo.</p><button type="button" className="primary" onClick={()=>void enableNotifications()} disabled={pushBusy}>{pushBusy?'⏳ Activando…':'🔔 Activar notificaciones'}</button>{pushStatus&&<div className="notice">{pushStatus}</div>}<div className="section-title">🧪 Diagnóstico de conexión</div><p>Comprueba si tu cuenta puede comunicarse con Firestore.</p><button type="button" className="primary" onClick={()=>void runFirebaseDiagnostic()} disabled={firebaseDiagBusy}>{firebaseDiagBusy?'⏳ Comprobando…':'🔎 Probar Firebase'}</button>{firebaseDiag&&<div className="notice">{firebaseDiag}</div>}<div className="settings-row"><span>Idioma</span><select value={lang} onChange={e=>setLang(e.target.value as Lang)}><option value="es">Español</option><option value="en">English</option><option value="pt">Português</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="it">Italiano</option><option value="tr">Türkçe</option><option value="ja">日本語</option><option value="ko">한국어</option><option value="zh">中文</option></select></div><div className="settings-row"><span>Tema</span><select value={theme} onChange={e=>setTheme(e.target.value as any)}><option value="neon">Neon</option><option value="midnight">Midnight</option></select></div><div className="settings-row"><span>Cuenta</span><button onClick={logout}>Cerrar sesión</button></div><div className="settings-row"><span>Seguridad</span><small>Firebase Authentication activo</small></div><div className="notice">Protege tu contraseña y no compartas códigos privados de salas fuera de la plataforma.</div></Panel>}
 <div className="mobile-bottom-nav">
   {(['home','battle','friends','profile'] as Tab[]).map(n=><button key={n} className={tab===n?'active':''} onClick={()=>{navigateTab(n);setMobileMore(false)}}><span>{icon(n)}</span><small>{t[n]}</small></button>)}
   <button className={mobileMore?'active':''} onClick={()=>setMobileMore(v=>!v)}><span>☰</span><small>Más</small></button>
 </div>
 {mobileMore&&<div className="mobile-more">{nav.filter(n=>!['home','battle','friends','profile'].includes(n)).map(n=><button key={n} className={tab===n?'active':''} onClick={()=>{navigateTab(n);setMobileMore(false)}}>{icon(n)} {t[n]}</button>)}</div>}
 </main></div></div>
}

function AuthScreen(p:any){
  const {authMode,setAuthMode,email,setEmail,password,setPassword,password2,setPassword2,name,setName,authMsg,setAuthMsg,handleAuth,resetPassword,resetSent,loginWithGoogle,lang,setLang,t,legalAccepted,setLegalAccepted,legalDoc,setLegalDoc}=p
  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="brand">⚡ <span>Aura farming battles</span><b>V5.174.3</b></div>
        <p>La arena donde tu Aura habla por ti.</p>
      </div>

      {authMode==='choice' ? (
        <div className="auth-choice-layout">
          <div className="auth-choice-visual">
            <img src="/assets/aura-arena-home.png" alt="AURA BATTLE Arena"/>
            <div className="auth-choice-overlay">
              <span>⚡ ONLINE AURA ARENA</span>
              <strong>Prepárate para la batalla</strong>
            </div>
          </div>
          <div className="auth-card auth-choice-card">
            <div className="eyebrow">ONLINE AURA ARENA</div>
            <h1>Entra al combate</h1>
            <p>Compite, gana Aura y descubre quién domina la arena.</p>
            <button className="primary" onClick={()=>setAuthMode('login')}>🔐 {t.login}</button>
            <button onClick={()=>setAuthMode('register')}>📝 {t.register}</button>
            <div className="lang-line">
              🌎
              <select value={lang} onChange={e=>setLang(e.target.value as Lang)}>
                <option value="es">Español</option><option value="en">English</option><option value="pt">Português</option>
                <option value="fr">Français</option><option value="de">Deutsch</option><option value="it">Italiano</option>
                <option value="tr">Türkçe</option><option value="ja">日本語</option><option value="ko">한국어</option><option value="zh">中文</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className={authMode==='login'?'auth-login-layout':'auth-form-wrap'}>
          {authMode==='login' && (
            <div className="auth-visual">
              <img src="/assets/aura-arena-home.png" alt="AURA BATTLE Arena"/>
              <div className="auth-visual-overlay">
                <span>⚡ ONLINE AURA ARENA</span>
                <strong>Prepárate para la batalla</strong>
              </div>
            </div>
          )}

          <form className="auth-card" onSubmit={handleAuth}>
            <div className="eyebrow">{authMode==='login'?'ACCESO':'NUEVO JUGADOR'}</div>
            <h1>{authMode==='login'?t.login:t.register}</h1>

            {authMode==='register' && (
              <input placeholder="Nombre de jugador" value={name} onChange={e=>setName(e.target.value)} required/>
            )}

            <input type="email" placeholder="Correo electrónico" value={email} onChange={e=>setEmail(e.target.value)} required/>
            <input type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} required/>

            {authMode==='register' && (
              <>
                <input type="password" placeholder="Repite la contraseña" value={password2} onChange={e=>setPassword2(e.target.value)} required/>
                <div className={password2?(password===password2?'match ok':'match bad'):'match'}>
                  {password2 ? (password===password2 ? '✓ Las contraseñas coinciden' : '✕ Las contraseñas no coinciden') : 'Confirmación de contraseña'}
                </div>
                <div className="legal-consent">
                  <label className="legal-check">
                    <input type="checkbox" checked={legalAccepted} onChange={e=>setLegalAccepted(e.target.checked)}/>
                    <span>He leído y acepto el Reglamento Oficial, los Términos y Condiciones y la Política de Privacidad.</span>
                  </label>
                  <div className="legal-links">
                    <button type="button" onClick={()=>setLegalDoc('reglamento')}>Reglamento</button>
                    <button type="button" onClick={()=>setLegalDoc('terminos')}>Términos</button>
                    <button type="button" onClick={()=>setLegalDoc('privacidad')}>Privacidad</button>
                  </div>
                </div>
              </>
            )}

            {authMsg && <div className="error">{authMsg}</div>}

            <button className="primary" type="submit">{authMode==='login'?t.login:t.register}</button>

            {authMode==='login' && (
              <>
                <div className="auth-divider"><span>o</span></div>
                <button type="button" className="google-button" onClick={loginWithGoogle}>G&nbsp;&nbsp; Continuar con Google</button>
                <button type="button" className="link-button" onClick={resetPassword}>¿Olvidaste tu contraseña?</button>
              </>
            )}

            {resetSent && <div className="success">✓ Revisa tu correo para restablecerla.</div>}

            <button type="button" onClick={()=>{setAuthMode('choice');setAuthMsg('')}}>← Volver</button>
          </form>
        </div>
      )}

      <div className="ad-slot auth-ad">Espacio publicitario · comunidad AURA BATTLE</div>

      {legalDoc && (
        <div className="legal-modal-backdrop" role="dialog" aria-modal="true" aria-label="Documento legal">
          <div className="legal-modal">
            <div className="legal-modal-head">
              <h2>{legalDoc==='reglamento'?'📜 Reglamento Oficial':legalDoc==='terminos'?'⚖️ Términos y Condiciones':'🔒 Política de Privacidad'}</h2>
              <button type="button" onClick={()=>setLegalDoc(null)}>✕</button>
            </div>
            <div className="legal-modal-body">
              {legalDoc==='reglamento' ? <>
                <p><b>Versión 1.0</b></p><h3>Conducta y juego limpio</h3><p>Juega de forma honesta y respetuosa. No se permiten trampas, bots, exploits, manipulación de resultados, acoso, amenazas, suplantación, discriminación ni actividades ilegales.</p><h3>Batallas con cámara</h3><p>La cámara se activa con la acción del usuario y puede procesarse para las mecánicas de Aura y seguridad. No muestres intencionalmente a terceros sin consentimiento, información privada, contenido sexual o material ilegal.</p><h3>Aura, niveles y ranking</h3><p>Son elementos virtuales del juego y pueden corregirse cuando existan errores, fraude o abuso.</p><h3>Chats y clanes</h3><p>El usuario es responsable de lo que publica. Se prohíben spam, amenazas, acoso, fraude y contenido ilegal.</p><h3>Sanciones</h3><p>El operador puede advertir, limitar funciones, cancelar partidas, suspender o cerrar cuentas cuando exista incumplimiento, fraude o riesgo de seguridad, respetando la ley aplicable.</p>
              </> : legalDoc==='terminos' ? <>
                <p><b>Versión 1.0</b></p><h3>Aceptación y cuenta</h3><p>Al utilizar AURA FARMING BATTLES aceptas estos términos, el Reglamento Oficial y la Política de Privacidad. Debes proporcionar información veraz y proteger tus credenciales.</p><h3>Propiedad intelectual</h3><p>El nombre, logotipos, interfaz, diseños, código, textos, gráficos y contenido oficial pertenecen a sus titulares o se utilizan bajo licencia. No puedes copiarlos, venderlos o explotarlos sin autorización.</p><h3>Elementos virtuales</h3><p>Aura, niveles, recompensas y rankings no son dinero ni moneda de curso legal.</p><h3>Uso prohibido</h3><p>No se permite acceso no autorizado, fraude, malware, bots no autorizados, manipulación de resultados ni acoso.</p><h3>Disponibilidad y cambios</h3><p>El servicio puede tener mantenimiento, interrupciones o cambios. Los términos pueden actualizarse y los cambios materiales se comunicarán conforme a la ley.</p><h3>Contacto legal</h3><p>Responsable: [NOMBRE DEL TITULAR O EMPRESA]. Contacto: [CORREO OFICIAL].</p>
              </> : <>
                <p><b>Versión 1.0</b></p><h3>Datos tratados</h3><p>Podemos tratar datos de cuenta, juego, funciones sociales, datos técnicos, tokens de notificaciones y datos de cámara/movimiento necesarios para las funciones descritas.</p><h3>Finalidades</h3><p>Administrar cuentas, prestar batallas, Aura, progresión, estadísticas, ranking, amigos, chats, clanes y notificaciones, además de seguridad, prevención de abuso y cumplimiento legal.</p><h3>Cámara</h3><p>Cuando activas la cámara, pueden procesarse imágenes o señales de movimiento para la batalla y análisis automatizado. La versión final debe especificar qué se procesa localmente, qué se transmite y qué se conserva.</p><h3>Proveedores</h3><p>La Plataforma puede utilizar servicios tecnológicos como Firebase/Google y proveedores de alojamiento e infraestructura, conforme a la legislación aplicable.</p><h3>Derechos y menores</h3><p>Según la legislación aplicable puedes tener derechos de acceso, corrección, eliminación, oposición, limitación y portabilidad. Se aplicarán restricciones de edad y mecanismos de consentimiento parental cuando correspondan.</p><h3>Contacto</h3><p>[CORREO OFICIAL] · [AUTORIDAD DE PROTECCIÓN DE DATOS, SI CORRESPONDE]</p>
              </>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function icon(n:Tab){return ({home:'🏠',profile:'👤',friends:'👥',chat:'💬',battle:'⚔️',ai:'🤖',ranking:'🏆',league:'🥇',clans:'🛡️',premium:'💎',settings:'⚙️'} as Record<Tab,string>)[n]}
function Panel({title,children}:{title:string;children:ReactNode}){return <section className="panel"><div className="panel-title">{title}</div>{children}</section>}
function Card({icon,title,text,action}:{icon:string;title:string;text:string;action:()=>void}){return <button className="feature" onClick={action}><span>{icon}</span><div><h3>{title}</h3><p>{text}</p></div><b>→</b></button>}
function Stat({label,value}:{label:string;value:string|number}){return <div className="stat"><small>{label}</small><strong>{value}</strong></div>}
function VideoCard({title,videoRef,score,muted=false}:{title:string;videoRef:RefObject<HTMLVideoElement|null>;score:number;muted?:boolean}){return <div className="video-card"><h3>{title}</h3><div className="video-frame"><video ref={videoRef} autoPlay playsInline muted={muted}/></div><div className="score-line"><div className="aura-label"><span>⚡ NIVEL DE AURA</span><b>{score} Aura</b></div><div className="bar"><span style={{width:`${Math.min(100,score)}%`}}/></div></div></div>}
