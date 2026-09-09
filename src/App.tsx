import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode, RefObject } from 'react'
import { auth, db } from './lib/firebase'
import { socket } from './lib/socket'
import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, updateProfile } from 'firebase/auth'
import { addDoc, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, arrayUnion, startAt, endAt, where } from 'firebase/firestore'

type Lang = 'es'|'en'|'pt'|'fr'|'de'|'it'|'tr'|'ja'|'ko'|'zh'
type Tab = 'home'|'profile'|'friends'|'chat'|'battle'|'ai'|'ranking'|'league'|'clans'|'premium'|'settings'

type Friend = {id:string; name:string; aura:number}
type ChatMsg = {id:string; uid:string; name:string; text:string; createdAt?:any}
type Clan = {id:string; name:string; owner:string; members:string[]; createdAt?:any}


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
 const [user,setUser]=useState(auth.currentUser); const [authMode,setAuthMode]=useState<'choice'|'login'|'register'>('choice'); const [lang,setLang]=useState<Lang>('es')
 const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [password2,setPassword2]=useState(''); const [name,setName]=useState(''); const [authMsg,setAuthMsg]=useState('')
 const [tab,setTab]=useState<Tab>('home'); const [profile,setProfile]=useState({aura:0,wins:0,losses:0,level:1})
 const [friendSearch,setFriendSearch]=useState(''); const [friends,setFriends]=useState<Friend[]>([]); const [friendResults,setFriendResults]=useState<Friend[]>([]); const [friendMsg,setFriendMsg]=useState(''); const [friendSearching,setFriendSearching]=useState(false)
 const [chat,setChat]=useState<ChatMsg[]>([]); const [chatInput,setChatInput]=useState(''); const [chatLoading,setChatLoading]=useState(false); const [chatMsg,setChatMsg]=useState(''); const [privateFriend,setPrivateFriend]=useState<Friend|null>(null); const [privateChat,setPrivateChat]=useState<ChatMsg[]>([]); const [privateInput,setPrivateInput]=useState(''); const [privateLoading,setPrivateLoading]=useState(false); const [privateMsg,setPrivateMsg]=useState('')
 const [leaders,setLeaders]=useState<Friend[]>([]); const [clans,setClans]=useState<Clan[]>([]); const [clanName,setClanName]=useState(''); const [clanMsg,setClanMsg]=useState('')
 const [premium,setPremium]=useState(false); const [musicOn,setMusicOn]=useState(true); const [mobileMore,setMobileMore]=useState(false); const [resetSent,setResetSent]=useState(false); const [theme,setTheme]=useState<'neon'|'midnight'>('neon')
 const [room,setRoom]=useState(''); const [roomCode,setRoomCode]=useState(''); const [roomStatus,setRoomStatus]=useState('Listo.'); const [opponentJoined,setOpponentJoined]=useState(false); const [bothCamerasReady,setBothCamerasReady]=useState(false); const [host,setHost]=useState(false); const [cameraOn,setCameraOn]=useState(false); const [battleStarted,setBattleStarted]=useState(false); const [battleSeconds,setBattleSeconds]=useState(0); const [aura,setAura]=useState(0); const [opponentAura,setOpponentAura]=useState(0); const [online,setOnline]=useState(0)
 const hostRef=useRef(false); const cameraSourceRef=useRef<'ai'|'battle'|null>(null); const videoRef=useRef<HTMLVideoElement>(null); const aiVideoRef=useRef<HTMLVideoElement>(null); const battleMusicRef=useRef<HTMLAudioElement>(null); const remoteVideoRef=useRef<HTMLVideoElement>(null); const localStreamRef=useRef<MediaStream|null>(null); const peerRef=useRef<RTCPeerConnection|null>(null); const pendingIceRef=useRef<RTCIceCandidateInit[]>([]); const canvasRef=useRef<HTMLCanvasElement|null>(null)
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

 useEffect(()=>{
   window.history.replaceState({auraTab:'home'},'',window.location.href)
   const onPopState=(event:PopStateEvent)=>{
     const next=event.state?.auraTab as Tab|undefined
     setTab(next||'home')
   }
   window.addEventListener('popstate',onPopState)
   return()=>window.removeEventListener('popstate',onPopState)
 },[])

 useEffect(()=>{
   const unsubscribe=onAuthStateChanged(auth,async u=>{
     setUser(u);setPrivateFriend(null);setPrivateChat([])
     if(!u){setFriends([]);return}
     setAuthMode('choice')
     setAuthMsg('')
     const snap=await getDoc(doc(db,'users',u.uid))
     if(snap.exists()){
       const d=snap.data()
       setProfile({aura:Number(d.aura||0),wins:Number(d.victorias||0),losses:Number(d.derrotas||0),level:Number(d.level||1)})
       const ids=Array.isArray(d.friends)?d.friends:[]
       const profiles=await Promise.all(ids.map(async(id:string)=>{
         try{
           const fs=await getDoc(doc(db,'users',id));if(!fs.exists())return null
           const x=fs.data();return{id,name:String(x.nombre||x.name||x.displayName||'Jugador'),aura:Number(x.aura||0)} as Friend
         }catch{return null}
       }))
       setFriends(profiles.filter(Boolean) as Friend[])
     }else{
       await setDoc(doc(db,'users',u.uid),{uid:u.uid,nombre:u.displayName||'Jugador',nombreLower:(u.displayName||'Jugador').toLowerCase(),email:u.email||'',aura:0,victorias:0,derrotas:0,level:1,friends:[],createdAt:serverTimestamp()},{merge:true})
       setFriends([])
     }
   })

   // Recupera explícitamente el resultado del inicio de sesión con Google
   // después de volver a AURA BATTLE desde la página de Google/Firebase.
   getRedirectResult(auth).catch((e:any)=>{
     console.error('Google redirect result error:',e)
     if(e?.code){
       setAuthMsg(e.message?.replace('Firebase: Error (auth/','').replace(').','')||'No se pudo completar el inicio de sesión con Google.')
       setAuthMode('login')
     }
   })

   return unsubscribe
 },[])

 useEffect(()=>{ if(!user)return; setChatLoading(true); setChatMsg(''); const q=query(collection(db,'chat'),orderBy('createdAt','desc'),limit(60)); return onSnapshot(q,s=>{setChat(s.docs.map(d=>({id:d.id,...d.data()} as ChatMsg)).reverse());setChatLoading(false)},e=>{console.error('Global chat load error:',e);setChatLoading(false);setChatMsg('⚠️ No se pudo cargar el chat global.')}) },[user])
 useEffect(()=>{ if(!user)return; const q=query(collection(db,'users'),orderBy('aura','desc'),limit(25)); return onSnapshot(q,s=>setLeaders(s.docs.map(d=>{const x=d.data(); return {id:d.id,name:x.nombre||'Jugador',aura:Number(x.aura||0)}}))) },[user])
 useEffect(()=>{ if(!user)return; const q=query(collection(db,'clans'),orderBy('createdAt','desc'),limit(20)); return onSnapshot(q,s=>setClans(s.docs.map(d=>({id:d.id,...d.data()} as Clan)))) },[user])
 useEffect(()=>{socket.on('online-count',(n:number)=>setOnline(n)); return()=>{socket.off('online-count')}},[])
 useEffect(()=>{
  socket.on('peer-joined',()=>{setOpponentJoined(true);setRoomStatus('Rival conectado. Activen ambas cámaras para comenzar.')})
  socket.on('peer-camera-ready',()=>setRoomStatus('El rival tiene la cámara lista. Activa la tuya para comenzar.'))
  socket.on('both-cameras-ready',async()=>{
    setBothCamerasReady(true)
    setRoomStatus('🎥 Ambas cámaras están listas. Conectando las cámaras…')
    if(hostRef.current){
      const pc=peerRef.current||await preparePeer()
      if(pc.signalingState==='stable' && pc.connectionState!=='connected'){
        const offer=await pc.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:true})
        await pc.setLocalDescription(offer)
        socket.emit('signal',{description:pc.localDescription})
      }
    }
  })
  socket.on('start',({endsAt}:{endsAt:number})=>{
    setBattleStarted(true)
    setRoomStatus('🔥 ¡BATALLA DE AURA EN CURSO!')
    setBattleSeconds(Math.max(0,Math.ceil((endsAt-Date.now())/1000)))
  })
  socket.on('battle-ended',async({aura1,aura2}:{aura1:number;aura2:number})=>{
    setAura(Math.round(aura1)); setOpponentAura(Math.round(aura2)); setBattleStarted(false); setBattleSeconds(0)
    const localAura=host?Math.round(aura1):Math.round(aura2)
    const rivalAura=host?Math.round(aura2):Math.round(aura1)
    const win=localAura>rivalAura
    const currentUser=auth.currentUser
    if(currentUser){
      try{
        const snap=await getDoc(doc(db,'users',currentUser.uid))
        const current=snap.exists()?snap.data():{}
        const currentAura=Number(current.aura||0)
        const currentWins=Number(current.victorias||0)
        const currentLosses=Number(current.derrotas||0)
        const delta=win?25:-10
        const nextAura=Math.max(0,currentAura+delta)
        const nextWins=currentWins+(win?1:0)
        const nextLosses=currentLosses+(win?0:1)
        const nextLevel=Math.max(1,Math.floor(nextAura/100)+1)
        await updateDoc(doc(db,'users',currentUser.uid),{aura:nextAura,victorias:nextWins,derrotas:nextLosses,level:nextLevel})
        setProfile({aura:nextAura,wins:nextWins,losses:nextLosses,level:nextLevel})
      }catch(e){console.error('Battle result save error:',e);setRoomStatus('⚠️ La batalla terminó, pero no pudimos guardar el resultado.')}
    }
    if(localStreamRef.current){localStreamRef.current.getTracks().forEach(t=>t.stop());localStreamRef.current=null}
    peerRef.current?.close();peerRef.current=null
    setCameraOn(false)
    setRoomStatus(win?'🏆 ¡Victoria! +25 Aura':'⚡ Derrota. -10 Aura')
  })
  socket.on('opponent-aura',(v:number)=>setOpponentAura(Math.round(v)))
  socket.on('peer-left',()=>{setOpponentJoined(false);setBothCamerasReady(false);setBattleStarted(false);setRoomStatus('El rival salió de la sala.')})
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
  return()=>{['peer-joined','peer-camera-ready','both-cameras-ready','start','opponent-aura','peer-left','signal'].forEach(x=>socket.off(x))}
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

useEffect(()=>{if(!cameraOn||!videoRef.current)return; const v=videoRef.current; const c=canvasRef.current||document.createElement('canvas');canvasRef.current=c;const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)return;const timer=window.setInterval(()=>{if(v.readyState<2)return;c.width=64;c.height=48;ctx.drawImage(v,0,0,64,48);const p=ctx.getImageData(0,0,64,48).data;let total=0,bright=0;for(let i=0;i<p.length;i+=4){const x=(p[i]+p[i+1]+p[i+2])/3;total+=x;if(x>155)bright++}const s=Math.min(100,Math.max(0,Math.round(total/(p.length/4)*.42+bright/(p.length/4)*45)));setAura(s);if(battleStarted)socket.emit('aura-score',s)},700);return()=>clearInterval(timer)},[cameraOn,battleStarted])

 async function handleAuth(e:FormEvent){e.preventDefault();setAuthMsg('');try{if(authMode==='register'){if(name.trim().length<2)return setAuthMsg('Escribe un nombre de jugador.');if(password!==password2)return setAuthMsg('Las contraseñas no coinciden.');if(password.length<6)return setAuthMsg('La contraseña debe tener al menos 6 caracteres.');const c=await createUserWithEmailAndPassword(auth,email,password);const clean=name.trim();await updateProfile(c.user,{displayName:clean});await setDoc(doc(db,'users',c.user.uid),{uid:c.user.uid,nombre:clean,nombreLower:clean.toLowerCase(),email,aura:0,victorias:0,derrotas:0,level:1,createdAt:serverTimestamp()},{merge:true})}else await signInWithEmailAndPassword(auth,email,password)}catch(e:any){setAuthMsg(e?.message?.replace('Firebase: Error (auth/','').replace(').','')||'No se pudo completar la operación.')}}
 async function resetPassword(){if(!email.trim()){setAuthMsg('Escribe tu correo para recuperar la contraseña.');return}try{await sendPasswordResetEmail(auth,email.trim());setResetSent(true);setAuthMsg('Te enviamos un enlace para restablecer tu contraseña.')}catch(e:any){setAuthMsg('No pudimos enviar el enlace de recuperación. Revisa el correo.')}}
 async function loginWithGoogle(){setAuthMsg('');try{const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await signInWithRedirect(auth,provider)}catch(e:any){console.error('Google sign-in error:',e);setAuthMsg(e?.message?.replace('Firebase: Error (auth/','').replace(').','')||'No se pudo iniciar sesión con Google.')}}
 async function finishBattle(){if(!user||!battleStarted)return;socket.emit('finish-battle');setRoomStatus('⏳ Finalizando la batalla…')}
 async function logout(){localStreamRef.current?.getTracks().forEach(x=>x.stop());peerRef.current?.close();await signOut(auth);socket.disconnect();navigateTab('home')}
 async function resetPeer(){pendingIceRef.current=[]; if(peerRef.current){peerRef.current.ontrack=null;peerRef.current.onicecandidate=null;peerRef.current.close();peerRef.current=null} setBothCamerasReady(false);setBattleStarted(false);setBattleSeconds(0);setOpponentAura(0)}
 async function createRoom(){hostRef.current=true;await resetPeer();if(!socket.connected)socket.connect();socket.emit('create',(r:any)=>{if(r?.ok){setRoomCode(r.code);setHost(true);hostRef.current=true;setOpponentJoined(false);setRoomStatus('Esperando al rival…');navigateTab('battle')}})}
 function joinRoom(){void resetPeer();if(!socket.connected)socket.connect();socket.emit('join',room.trim().toUpperCase(),(r:any)=>{if(r?.ok){setRoomCode(r.code);setHost(false);hostRef.current=false;setOpponentJoined(true);setRoomStatus('Conectado a la sala. Activa tu cámara.');navigateTab('battle')}else setRoomStatus(r?.error||'No se pudo unir.')})}
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
     const videoConstraints={facingMode:{ideal:'user'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}}
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
   if(!opponentJoined||!cameraOn||!bothCamerasReady){setRoomStatus('🎥 Espera a que las dos cámaras estén activas antes de iniciar la batalla.');return}
   socket.emit('start')
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
  try{
    await updateDoc(doc(db,'users',user.uid),{friends:arrayUnion(f.id)})
    setFriends(v=>v.some(x=>x.id===f.id)?v:[...v,f])
    setFriendMsg(`🤝 ${f.name} fue añadido a tus amigos.`)
  }catch(error){
    console.error('Add friend error:',error)
    setFriendMsg('❌ No se pudo añadir este jugador. Revisa los permisos de Firebase.')
  }
 }
 const conversationId=(a:string,b:string)=>[a,b].sort().join('_')
 function openPrivateChat(f:Friend){setPrivateFriend(f);setPrivateInput('');setPrivateMsg('');navigateTab('chat')}
 useEffect(()=>{if(!user||!privateFriend){setPrivateChat([]);return}setPrivateLoading(true);setPrivateMsg('');const cid=conversationId(user.uid,privateFriend.id);const q=query(collection(db,'privateChats'),where('conversationId','==',cid),limit(100));return onSnapshot(q,s=>{const rows=s.docs.map(d=>({id:d.id,...d.data()} as ChatMsg));rows.sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0));setPrivateChat(rows);setPrivateLoading(false)},e=>{console.error('Private chat load error:',e);setPrivateLoading(false);setPrivateMsg('⚠️ No se pudo cargar el chat con este amigo.')})},[user,privateFriend])
 async function sendPrivateChat(e:FormEvent){e.preventDefault();const text=privateInput.trim();if(!text||!user||!privateFriend)return;setPrivateMsg('');setPrivateInput('');try{await addDoc(collection(db,'privateChats'),{uid:user.uid,name:user.displayName||'Jugador',text,conversationId:conversationId(user.uid,privateFriend.id),participants:[user.uid,privateFriend.id],createdAt:serverTimestamp()})}catch(error){console.error('Private chat send error:',error);setPrivateInput(text);setPrivateMsg('⚠️ No se pudo enviar el mensaje. Revisa tu conexión.')}}
 async function createClan(){
  const name=clanName.trim()
  if(!user)return
  if(name.length<3){setClanMsg('⚠️ El nombre del clan debe tener al menos 3 caracteres.');return}
  try{
    const ref=await addDoc(collection(db,'clans'),{name,owner:user.uid,members:[user.uid],createdAt:serverTimestamp()})
    setClanName('')
    setClanMsg(`✅ Clan creado correctamente: ${ref.id.slice(0,6).toUpperCase()}`)
    navigateTab('clans')
  }catch(error){
    console.error('Create clan error:',error)
    setClanMsg('❌ No se pudo crear el clan. Revisa tu conexión y los permisos de Firebase.')
  }
}
 async function joinClan(c:Clan){if(!user)return;await updateDoc(doc(db,'clans',c.id),{members:arrayUnion(user.uid)});alert('Te uniste al clan.')}

 if(!user)return <AuthScreen {...{authMode,setAuthMode,email,setEmail,password,setPassword,password2,setPassword2,name,setName,authMsg,setAuthMsg,handleAuth,resetPassword,resetSent,loginWithGoogle,lang,setLang,t}}/>
 return <div className={`app ${theme}`}><audio ref={battleMusicRef} src="/assets/audio/aura-battle-theme.wav" loop preload="auto" /><header className="topbar"><div className="brand">⚡ <span>AURA BATTLE</span><b>V5.136</b></div><div className="top-actions"><span className="online-pill">● {online} {t.online}</span><select value={lang} onChange={e=>setLang(e.target.value as Lang)}><option value="es">ES</option><option value="en">EN</option><option value="pt">PT</option><option value="fr">FR</option><option value="de">DE</option><option value="it">IT</option><option value="tr">TR</option><option value="ja">JA</option><option value="ko">KO</option><option value="zh">中文</option></select><button onClick={logout}>{t.logout}</button></div></header>
 <div className="layout"><aside className="sidebar"><div className="mini-profile"><div className="profile-icon">⚡</div><div><strong>{user.displayName||'Jugador'}</strong><small>⚡ {profile.aura} Aura · Lv.{profile.level}</small></div></div>{nav.map(n=><button key={n} className={tab===n?'nav active':'nav'} onClick={()=>navigateTab(n)}>{icon(n)} {t[n]}</button>)}<div className="ad-slot side-ad">PUBLICIDAD<br/><small>Espacio para marcas</small></div></aside>
 <main className="content">
 {tab==='home'&&<section className="home-hero"><div className="hero-copy"><div className="eyebrow">⚡ ONLINE AURA ARENA</div><h1>{t.welcome}</h1><p>Compite en vivo, gana Aura y construye tu reputación.</p><div className="hero-actions"><button className="primary" onClick={()=>navigateTab('battle')}>⚔️ {t.play}</button><button onClick={()=>navigateTab('profile')}>👤 Mi perfil</button></div><div className="quick-stats"><Stat label="⚡ Tu Aura" value={profile.aura}/><Stat label="🏆 Victorias" value={profile.wins}/><Stat label="🔥 Nivel" value={profile.level}/></div></div><div className="hero-art"><img src="/assets/aura-arena-home.png" alt="AURA BATTLE Arena"/><div className="hero-glow">LIVE</div></div><div className="home-grid"><Card icon="⚔️" title="Batallas 1v1" text="Crea una sala y reta a otra persona con cámara." action={()=>navigateTab('battle')}/><Card icon="🤖" title="IA Aura" text="Convierte señales visuales de tu cámara en una métrica de Aura." action={()=>navigateTab('ai')}/><Card icon="🏆" title="Ranking global" text="Sube posiciones con tus victorias y puntuación." action={()=>navigateTab('ranking')}/><Card icon="🛡️" title="Clanes" text="Forma equipos y crea una comunidad alrededor de tu Aura." action={()=>navigateTab('clans')}/></div><div className="ad-slot banner-ad">ESPACIO PUBLICITARIO · AURA BATTLE</div></section>}
 {tab==='profile'&&<Panel title="👤 Mi perfil"><div className="profile-head"><div className="big-profile-icon">⚡</div><div><h2>{user.displayName||'Jugador'}</h2><p>{user.email}</p><span className="badge">Nivel {profile.level}</span></div></div><div className="stats"><Stat label="Aura" value={profile.aura}/><Stat label="Victorias" value={profile.wins}/><Stat label="Derrotas" value={profile.losses}/><Stat label="Ratio" value={`${profile.wins+profile.losses?Math.round(profile.wins/(profile.wins+profile.losses)*100):0}%`}/></div><div className="profile-actions"><button className="primary" onClick={()=>navigateTab('battle')}>⚔️ Ir a batallar</button><button onClick={()=>navigateTab('settings')}>⚙️ Ajustes</button></div></Panel>}
 {tab==='friends'&&<Panel title="👥 Amigos"><p>Encuentra jugadores y añade rivales a tu red.</p><div className="inline"><input placeholder="Nombre del jugador" value={friendSearch} onChange={e=>setFriendSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchFriends()}/><button type="button" onClick={searchFriends} disabled={friendSearching}>{friendSearching?'⏳ Buscando…':'🔎 Buscar'}</button></div>{friendMsg&&<div className="notice">{friendMsg}</div>}{friendResults.length>0&&<div className="list">{friendResults.map(f=><div className="list-row" key={f.id}>🧑 <span>{f.name}<small>⚡ {f.aura}</small></span><button onClick={()=>addFriend(f)}>＋ Añadir</button></div>)}</div>}<div className="section-title">Mis amigos</div><div className="list">{friends.length?friends.map(f=><div className="list-row" key={f.id}>🟢 <span>{f.name}<small>⚡ {f.aura}</small></span><button className="primary" onClick={()=>openPrivateChat(f)}>💬 Chat</button></div>):<div className="empty">Todavía no tienes amigos. Busca un jugador arriba.</div>}</div></Panel>}
 {tab==='chat'&&<Panel title={privateFriend?`💬 Chat con ${privateFriend.name}`:'💬 Chat global'}>{privateFriend?<><button type="button" onClick={()=>{setPrivateFriend(null);setPrivateChat([])}}>← Chat global</button><div className="private-chat-head">🟢 {privateFriend.name}<small>⚡ {privateFriend.aura} Aura</small></div><div className="chat-box private-chat-box">{privateChat.length?privateChat.map(m=><div className={m.uid===user.uid?'bubble mine':'bubble'} key={m.id}><strong>{m.name}</strong><span>{m.text}</span></div>):<div className="empty">{privateLoading?'Cargando conversación…':'Todavía no hay mensajes. ¡Saluda a tu amigo!'}</div>}</div><form className="inline" onSubmit={sendPrivateChat}><input maxLength={300} value={privateInput} onChange={e=>setPrivateInput(e.target.value)} placeholder={`Escribe a ${privateFriend.name}…`}/><button className="primary" type="submit" disabled={!privateInput.trim()||privateLoading}>Enviar</button></form>{privateMsg&&<div className="notice">{privateMsg}</div>}<small className="small">Chat privado entre amigos. Solo ustedes dos pueden verlo.</small></>:<><div className="chat-box">{chat.length?chat.map(m=><div className={m.uid===user.uid?'bubble mine':'bubble'} key={m.id}><strong>{m.name}</strong><span>{m.text}</span></div>):<div className="empty">Sé la primera persona en escribir.</div>}</div><form className="inline" onSubmit={sendChat}><input maxLength={300} value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Escribe un mensaje…"/><button className="primary" type="submit" disabled={!chatInput.trim()||chatLoading}>Enviar</button></form>{chatMsg&&<div className="notice">{chatMsg}</div>}<small className="small">Chat público de la comunidad. No compartas datos personales.</small></>}</Panel>}
 {tab==='battle'&&<Panel title="⚔️ Batallas 1v1"><div className="battle-intro"><div><h2>Entra a la arena</h2><p>Crea una sala y comparte el código con tu rival, o únete a una sala existente.</p></div><div className="live-dot">● LIVE</div></div><div className="room-card">{!roomCode?<div className="room-actions"><button className="primary" onClick={createRoom}>{t.create}</button><span>o</span><input maxLength={6} placeholder={t.code} value={room} onChange={e=>setRoom(e.target.value.toUpperCase())}/><button onClick={joinRoom}>{t.join}</button></div>:<><div className="room-code">{roomCode}</div><button className="copy-btn" onClick={()=>navigator.clipboard?.writeText(roomCode)}>📋 Copiar código</button><div className="status">{roomStatus}</div><div className="battle-actions"><button onClick={startCamera}>📷 {cameraOn?'CÁMARA ACTIVA':'ACTIVAR CÁMARA'}</button><button className="primary" disabled={!opponentJoined||!cameraOn||!bothCamerasReady} onClick={startBattle}>🔥 {battleStarted?'BATALLA EN CURSO':'INICIAR BATALLA'}</button>{battleStarted&&<button onClick={finishBattle}>🏁 Terminar y guardar resultado</button>}</div></>}</div><div className="video-grid"><VideoCard title={user.displayName||'Jugador 1'} videoRef={videoRef} score={aura} muted/><VideoCard title="Rival" videoRef={remoteVideoRef} score={opponentAura}/></div>{battleStarted&&<div className="battle-banner">🔥 BATALLA ACTIVA · ⏱️ {battleSeconds}s · ¡Sube tu Aura! <button className="music-toggle" onClick={()=>setMusicOn(v=>!v)}>{musicOn?'🔊 Música':'🔇 Música'}</button></div>}</Panel>}
 {tab==='ai'&&<Panel title="🤖 IA Aura"><div className="training-notice"><strong>🎯 ÁREA DE ENTRENAMIENTO</strong><span>Usa esta sección para practicar y aprender a controlar tu Aura antes de entrar a batallas de farmeo de Aura.</span><small>⚠️ El Aura mostrado aquí es de entrenamiento y no suma Aura a tu perfil.</small></div><div className="ai-camera-card"><div className="ai-camera-frame"><video ref={aiVideoRef} autoPlay playsInline muted/>{!cameraOn&&<div className="ai-camera-placeholder">📷<span>Activa tu cámara para entrenar y ver tu Aura aquí</span></div>}<div className="ai-camera-badge">{cameraOn?'● CÁMARA ACTIVA':'● CÁMARA INACTIVA'}</div>{cameraOn&&<div className="ai-aura-overlay"><span>⚡ AURA</span><b>{aura}</b></div>}</div><div className="ai-aura-label">⚡ Aura detectada: <strong>{aura}</strong></div><div className="ai-meter"><div className="meter-fill" style={{width:`${aura}%`}}/></div></div><div className="ai-hero"><div><h2>Tu Aura de entrenamiento</h2><div className="aura-number">{aura}</div><p>La lectura es una métrica visual local de demostración para practicar antes de entrar a una batalla.</p></div><div className="ai-orb">⚡</div></div><button className="primary" onClick={startCamera}>{cameraOn?'✓ Cámara conectada':'📷 Activar cámara'}</button><div className="notice">Consejo: buena iluminación, rostro visible y encuadre estable ayudan a obtener una señal visual más consistente.</div></Panel>}
 {tab==='ranking'&&<Panel title="🏆 Ranking global"><div className="podium"><div>🥈 {leaders[1]?.name||'—'}<b>{leaders[1]?.aura||0}</b></div><div>🥇 {leaders[0]?.name||'—'}<b>{leaders[0]?.aura||0}</b></div><div>🥉 {leaders[2]?.name||'—'}<b>{leaders[2]?.aura||0}</b></div></div><div className="leader-list">{leaders.map((x,i)=><div className="leader" key={x.id}><span>#{i+1} · {x.name}</span><b>⚡ {x.aura}</b></div>)}</div></Panel>}
 {tab==='league'&&<Panel title="🥇 Liga"><div className="league-card"><div className="league-badge">⚡</div><h2>Bronce</h2><p>Gana batallas para subir a Plata, Oro y las divisiones superiores.</p><div className="progress"><span style={{width:`${Math.min(100,(profile.wins*10)%101)}%`}}/></div><small>{profile.wins*10} / 100 puntos de ascenso</small></div><div className="three-col"><Stat label="Temporada" value="01"/><Stat label="Victorias" value={profile.wins}/><Stat label="Nivel" value={profile.level}/></div></Panel>}
 {tab==='clans'&&<Panel title="🛡️ Clanes"><div className="clan-create"><input placeholder="Nombre del clan" value={clanName} onChange={e=>{setClanName(e.target.value);setClanMsg('')}}/><button className="primary" onClick={createClan}>＋ Crear clan</button></div>{clanMsg&&<div className="notice">{clanMsg}</div>}<div className="section-title">Clanes de la comunidad</div><div className="home-grid">{clans.length?clans.map(c=><div className="clan-card" key={c.id}><h3>{c.name}</h3><p>👥 {c.members?.length||0} miembros</p><button onClick={()=>joinClan(c)}>Unirme</button></div>):<div className="empty">Sé el primer clan de la comunidad.</div>}</div></Panel>}
 {tab==='premium'&&<Panel title="💎 Premium"><div className="premium-box"><div className="premium-icon">💎</div><h2>AURA BATTLE Premium</h2><p>Beneficios previstos: cosméticos exclusivos, estadísticas avanzadas, insignias y experiencia sin publicidad.</p><div className="premium-list"><span>✓ Efectos y beneficios exclusivos</span><span>✓ Estadísticas avanzadas</span><span>✓ Insignia Premium</span><span>✓ Sin publicidad</span></div><button className="primary" onClick={()=>setPremium(v=>!v)}>{premium?'✓ Premium demo activado':'Ver beneficios'}</button></div><div className="notice">Los pagos reales todavía no están activados. Antes de cobrar, conectaremos un proveedor de pagos y políticas legales.</div></Panel>}
 {tab==='settings'&&<Panel title="⚙️ Ajustes"><div className="settings-row"><span>Idioma</span><select value={lang} onChange={e=>setLang(e.target.value as Lang)}><option value="es">Español</option><option value="en">English</option><option value="pt">Português</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="it">Italiano</option><option value="tr">Türkçe</option><option value="ja">日本語</option><option value="ko">한국어</option><option value="zh">中文</option></select></div><div className="settings-row"><span>Tema</span><select value={theme} onChange={e=>setTheme(e.target.value as any)}><option value="neon">Neon</option><option value="midnight">Midnight</option></select></div><div className="settings-row"><span>Cuenta</span><button onClick={logout}>Cerrar sesión</button></div><div className="settings-row"><span>Seguridad</span><small>Firebase Authentication activo</small></div><div className="notice">Protege tu contraseña y no compartas códigos privados de salas fuera de la plataforma.</div></Panel>}
 <div className="mobile-bottom-nav">
   {(['home','battle','friends','profile'] as Tab[]).map(n=><button key={n} className={tab===n?'active':''} onClick={()=>{navigateTab(n);setMobileMore(false)}}><span>{icon(n)}</span><small>{t[n]}</small></button>)}
   <button className={mobileMore?'active':''} onClick={()=>setMobileMore(v=>!v)}><span>☰</span><small>Más</small></button>
 </div>
 {mobileMore&&<div className="mobile-more">{nav.filter(n=>!['home','battle','friends','profile'].includes(n)).map(n=><button key={n} className={tab===n?'active':''} onClick={()=>{navigateTab(n);setMobileMore(false)}}>{icon(n)} {t[n]}</button>)}</div>}
 </main></div></div>
}

function AuthScreen(p:any){
  const {authMode,setAuthMode,email,setEmail,password,setPassword,password2,setPassword2,name,setName,authMsg,setAuthMsg,handleAuth,resetPassword,resetSent,loginWithGoogle,lang,setLang,t}=p
  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="brand">⚡ <span>AURA BATTLE</span><b>V5.136</b></div>
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
    </div>
  )
}

function icon(n:Tab){return ({home:'🏠',profile:'👤',friends:'👥',chat:'💬',battle:'⚔️',ai:'🤖',ranking:'🏆',league:'🥇',clans:'🛡️',premium:'💎',settings:'⚙️'} as Record<Tab,string>)[n]}
function Panel({title,children}:{title:string;children:ReactNode}){return <section className="panel"><div className="panel-title">{title}</div>{children}</section>}
function Card({icon,title,text,action}:{icon:string;title:string;text:string;action:()=>void}){return <button className="feature" onClick={action}><span>{icon}</span><div><h3>{title}</h3><p>{text}</p></div><b>→</b></button>}
function Stat({label,value}:{label:string;value:string|number}){return <div className="stat"><small>{label}</small><strong>{value}</strong></div>}
function VideoCard({title,videoRef,score,muted=false}:{title:string;videoRef:RefObject<HTMLVideoElement|null>;score:number;muted?:boolean}){return <div className="video-card"><h3>{title}</h3><div className="video-frame"><video ref={videoRef} autoPlay playsInline muted={muted}/></div><div className="score-line"><b>⚡ {score}</b><div className="bar"><span style={{width:`${Math.min(100,score)}%`}}/></div></div></div>}
