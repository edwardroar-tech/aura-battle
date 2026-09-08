import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode, RefObject } from 'react'
import { auth, db } from './lib/firebase'
import { socket } from './lib/socket'
import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth'
import { addDoc, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, arrayUnion } from 'firebase/firestore'

type Lang = 'es'|'en'|'pt'|'fr'|'de'|'it'|'tr'|'ja'|'ko'|'zh'
type Tab = 'home'|'profile'|'friends'|'chat'|'battle'|'ai'|'ranking'|'league'|'clans'|'premium'|'settings'

type Friend = {id:string; name:string; aura:number}
type ChatMsg = {id:string; uid:string; name:string; text:string; createdAt?:any}
type Clan = {id:string; name:string; tag:string; owner:string; members:string[]; createdAt?:any}


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
 const [friendSearch,setFriendSearch]=useState(''); const [friends,setFriends]=useState<Friend[]>([]); const [friendResults,setFriendResults]=useState<Friend[]>([])
 const [chat,setChat]=useState<ChatMsg[]>([]); const [chatInput,setChatInput]=useState(''); const [chatLoading,setChatLoading]=useState(false)
 const [leaders,setLeaders]=useState<Friend[]>([]); const [clans,setClans]=useState<Clan[]>([]); const [clanName,setClanName]=useState(''); const [clanTag,setClanTag]=useState('')
 const [premium,setPremium]=useState(false); const [musicOn,setMusicOn]=useState(true); const [mobileMore,setMobileMore]=useState(false); const [resetSent,setResetSent]=useState(false); const [theme,setTheme]=useState<'neon'|'midnight'>('neon')
 const [room,setRoom]=useState(''); const [roomCode,setRoomCode]=useState(''); const [roomStatus,setRoomStatus]=useState('Listo.'); const [opponentJoined,setOpponentJoined]=useState(false); const [bothCamerasReady,setBothCamerasReady]=useState(false); const [host,setHost]=useState(false); const [cameraOn,setCameraOn]=useState(false); const [battleStarted,setBattleStarted]=useState(false); const [aura,setAura]=useState(0); const [opponentAura,setOpponentAura]=useState(0); const [online,setOnline]=useState(0)
 const videoRef=useRef<HTMLVideoElement>(null); const battleMusicRef=useRef<HTMLAudioElement>(null); const remoteVideoRef=useRef<HTMLVideoElement>(null); const localStreamRef=useRef<MediaStream|null>(null); const peerRef=useRef<RTCPeerConnection|null>(null); const pendingIceRef=useRef<RTCIceCandidateInit[]>([]); const canvasRef=useRef<HTMLCanvasElement|null>(null)
 const t=copy[lang]

 useEffect(()=>onAuthStateChanged(auth,async u=>{setUser(u); if(!u)return; setAuthMode('choice'); const snap=await getDoc(doc(db,'users',u.uid)); if(snap.exists()){const d=snap.data(); setProfile({aura:Number(d.aura||0),wins:Number(d.victorias||0),losses:Number(d.derrotas||0),level:Number(d.level||1)});} else await setDoc(doc(db,'users',u.uid),{uid:u.uid,nombre:u.displayName||'Jugador',nombreLower:(u.displayName||'Jugador').toLowerCase(),email:u.email||'',aura:0,victorias:0,derrotas:0,level:1,createdAt:serverTimestamp()},{merge:true})}),[])

 useEffect(()=>{ if(!user)return; const q=query(collection(db,'chat'),orderBy('createdAt','desc'),limit(60)); return onSnapshot(q,s=>setChat(s.docs.map(d=>({id:d.id,...d.data()} as ChatMsg)).reverse()),()=>setChatLoading(false)) },[user])
 useEffect(()=>{ if(!user)return; const q=query(collection(db,'users'),orderBy('aura','desc'),limit(25)); return onSnapshot(q,s=>setLeaders(s.docs.map(d=>{const x=d.data(); return {id:d.id,name:x.nombre||'Jugador',aura:Number(x.aura||0)}}))) },[user])
 useEffect(()=>{ if(!user)return; const q=query(collection(db,'clans'),orderBy('createdAt','desc'),limit(20)); return onSnapshot(q,s=>setClans(s.docs.map(d=>({id:d.id,...d.data()} as Clan)))) },[user])
 useEffect(()=>{socket.on('online-count',(n:number)=>setOnline(n)); return()=>{socket.off('online-count')}},[])
 useEffect(()=>{
  socket.on('peer-joined',()=>{setOpponentJoined(true);setRoomStatus('Rival conectado. Activen ambas cámaras para comenzar.')})
  socket.on('peer-camera-ready',()=>setRoomStatus('El rival tiene la cámara lista. Activa la tuya para comenzar.'))
  socket.on('both-cameras-ready',()=>{setBothCamerasReady(true);setRoomStatus('🎥 Ambas cámaras están listas. ¡Puedes iniciar la batalla!')})
  socket.on('start',()=>setBattleStarted(true))
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

useEffect(()=>{if(!cameraOn||!videoRef.current)return; const v=videoRef.current; const c=canvasRef.current||document.createElement('canvas');canvasRef.current=c;const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)return;const timer=window.setInterval(()=>{if(v.readyState<2)return;c.width=64;c.height=48;ctx.drawImage(v,0,0,64,48);const p=ctx.getImageData(0,0,64,48).data;let total=0,bright=0;for(let i=0;i<p.length;i+=4){const x=(p[i]+p[i+1]+p[i+2])/3;total+=x;if(x>155)bright++}const s=Math.min(100,Math.max(0,Math.round(total/(p.length/4)*.42+bright/(p.length/4)*45)));setAura(s);if(battleStarted)socket.emit('aura-score',s)},700);return()=>clearInterval(timer)},[cameraOn,battleStarted])

 async function handleAuth(e:FormEvent){e.preventDefault();setAuthMsg('');try{if(authMode==='register'){if(name.trim().length<2)return setAuthMsg('Escribe un nombre de jugador.');if(password!==password2)return setAuthMsg('Las contraseñas no coinciden.');if(password.length<6)return setAuthMsg('La contraseña debe tener al menos 6 caracteres.');const c=await createUserWithEmailAndPassword(auth,email,password);const clean=name.trim();await updateProfile(c.user,{displayName:clean});await setDoc(doc(db,'users',c.user.uid),{uid:c.user.uid,nombre:clean,nombreLower:clean.toLowerCase(),email,aura:0,victorias:0,derrotas:0,level:1,createdAt:serverTimestamp()},{merge:true})}else await signInWithEmailAndPassword(auth,email,password)}catch(e:any){setAuthMsg(e?.message?.replace('Firebase: Error (auth/','').replace(').','')||'No se pudo completar la operación.')}}
 async function resetPassword(){if(!email.trim()){setAuthMsg('Escribe tu correo para recuperar la contraseña.');return}try{await sendPasswordResetEmail(auth,email.trim());setResetSent(true);setAuthMsg('Te enviamos un enlace para restablecer tu contraseña.')}catch(e:any){setAuthMsg('No pudimos enviar el enlace de recuperación. Revisa el correo.')}}
 async function finishBattle(){if(!user||!battleStarted)return;const win=aura>opponentAura;const delta=win?25:-10;const nextAura=Math.max(0,profile.aura+delta);const nextWins=profile.wins+(win?1:0);const nextLosses=profile.losses+(win?0:1);const nextLevel=Math.max(1,Math.floor(nextAura/100)+1);await updateDoc(doc(db,'users',user.uid),{aura:nextAura,victorias:nextWins,derrotas:nextLosses,level:nextLevel});setProfile({aura:nextAura,wins:nextWins,losses:nextLosses,level:nextLevel});setBattleStarted(false);battleMusicRef.current?.pause();if(localStreamRef.current){localStreamRef.current.getTracks().forEach(t=>t.stop());localStreamRef.current=null}setCameraOn(false);peerRef.current?.close();peerRef.current=null;setRoomStatus(win?'🏆 ¡Victoria! +25 Aura':'⚡ Derrota. -10 Aura')}
 async function logout(){localStreamRef.current?.getTracks().forEach(x=>x.stop());peerRef.current?.close();await signOut(auth);socket.disconnect();setTab('home')}
 async function resetPeer(){pendingIceRef.current=[]; if(peerRef.current){peerRef.current.ontrack=null;peerRef.current.onicecandidate=null;peerRef.current.close();peerRef.current=null} setBothCamerasReady(false);setBattleStarted(false);setOpponentAura(0)}
 async function createRoom(){await resetPeer();if(!socket.connected)socket.connect();socket.emit('create',(r:any)=>{if(r?.ok){setRoomCode(r.code);setHost(true);setOpponentJoined(false);setRoomStatus('Esperando al rival…');setTab('battle')}})}
 function joinRoom(){void resetPeer();if(!socket.connected)socket.connect();socket.emit('join',room.trim().toUpperCase(),(r:any)=>{if(r?.ok){setRoomCode(r.code);setHost(false);setOpponentJoined(true);setRoomStatus('Conectado a la sala. Activa tu cámara.');setTab('battle')}else setRoomStatus(r?.error||'No se pudo unir.')})}
 function attachLocalStream(stream:MediaStream){
   localStreamRef.current=stream
   const video=videoRef.current
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
     if(localStreamRef.current){attachLocalStream(localStreamRef.current);setCameraOn(true);if(!socket.connected)socket.connect();socket.emit('camera-ready');return}
     setRoomStatus('Solicitando acceso a cámara y micrófono…')
     let s:MediaStream
     try{
       s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'user'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}},audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})
     }catch(firstError){
       console.warn('Preferred camera constraints failed',firstError)
       s=await navigator.mediaDevices.getUserMedia({video:true,audio:true})
     }
     attachLocalStream(s)
     setCameraOn(true)
     if(!socket.connected)socket.connect()
     await preparePeer()
     socket.emit('camera-ready')
     setRoomStatus(opponentJoined?'Cámara activa. Esperando que ambas cámaras estén listas…':'Cámara activa. Esperando al rival…')
   }catch(error){
     console.error('Camera error',error)
     const name=(error as DOMException)?.name
     if(name==='NotAllowedError'||name==='PermissionDeniedError') setRoomStatus('Permiso de cámara/micrófono denegado. En el navegador, permite Cámara y Micrófono para aura-battle-naol.onrender.com y vuelve a intentarlo.')
     else if(name==='NotReadableError'||name==='TrackStartError') setRoomStatus('La cámara está siendo usada por otra aplicación. Ciérrala y vuelve a intentarlo.')
     else setRoomStatus('No pudimos iniciar la cámara. Revisa permisos del navegador y vuelve a intentarlo.')
   }
 }
 async function startBattle(){
   if(!opponentJoined||!cameraOn||!bothCamerasReady){setRoomStatus('🎥 Espera a que las dos cámaras estén activas antes de iniciar la batalla.');return}
   setBattleStarted(true)
   socket.emit('start')
   if(host){
     const pc=peerRef.current||await preparePeer()
     if(pc.signalingState!=='stable'){setRoomStatus('Conexión de cámara ocupada. Espera un momento e inténtalo de nuevo.');return}
     const offer=await pc.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:true})
     await pc.setLocalDescription(offer)
     socket.emit('signal',{description:pc.localDescription})
   }
 }
 async function sendChat(e:FormEvent){e.preventDefault();const text=chatInput.trim();if(!text||!user)return;setChatInput('');try{await addDoc(collection(db,'chat'),{uid:user.uid,name:user.displayName||'Jugador',text,createdAt:serverTimestamp()})}catch{setChat(v=>[...v,{id:crypto.randomUUID(),uid:user.uid,name:user.displayName||'Jugador',text}])}}
 async function searchFriends(){const term=friendSearch.trim().toLowerCase();if(!term)return setFriendResults([]);const snap=await getDocs(query(collection(db,'users'),limit(50)));setFriendResults(snap.docs.filter(d=>d.id!==user?.uid).map(d=>{const x=d.data();return{id:d.id,name:x.nombre||'Jugador',aura:Number(x.aura||0)}}).filter(x=>x.name.toLowerCase().includes(term)).slice(0,10))}
 async function addFriend(f:Friend){if(!user)return;await updateDoc(doc(db,'users',user.uid),{friends:arrayUnion(f.id)});setFriends(v=>v.some(x=>x.id===f.id)?v:[...v,f])}
 async function createClan(){if(!user||clanName.trim().length<3)return;const ref=await addDoc(collection(db,'clans'),{name:clanName.trim(),tag:(clanTag.trim()||'AURA').toUpperCase().slice(0,6),owner:user.uid,members:[user.uid],createdAt:serverTimestamp()});setClanName('');setClanTag('');setTab('clans');alert(`Clan creado: ${ref.id.slice(0,6).toUpperCase()}`)}
 async function joinClan(c:Clan){if(!user)return;await updateDoc(doc(db,'clans',c.id),{members:arrayUnion(user.uid)});alert('Te uniste al clan.')}

 if(!user)return <AuthScreen {...{authMode,setAuthMode,email,setEmail,password,setPassword,password2,setPassword2,name,setName,authMsg,setAuthMsg,handleAuth,resetPassword,resetSent,lang,setLang,t}}/>
 return <div className={`app ${theme}`}><audio ref={battleMusicRef} src="/assets/audio/aura-battle-theme.wav" loop preload="auto" /><header className="topbar"><div className="brand">⚡ <span>AURA BATTLE</span><b>V4</b></div><div className="top-actions"><span className="online-pill">● {online} {t.online}</span><select value={lang} onChange={e=>setLang(e.target.value as Lang)}><option value="es">ES</option><option value="en">EN</option><option value="pt">PT</option><option value="fr">FR</option><option value="de">DE</option><option value="it">IT</option><option value="tr">TR</option><option value="ja">JA</option><option value="ko">KO</option><option value="zh">中文</option></select><button onClick={logout}>{t.logout}</button></div></header>
 <div className="layout"><aside className="sidebar"><div className="mini-profile"><div className="profile-icon">⚡</div><div><strong>{user.displayName||'Jugador'}</strong><small>⚡ {profile.aura} Aura · Lv.{profile.level}</small></div></div>{nav.map(n=><button key={n} className={tab===n?'nav active':'nav'} onClick={()=>setTab(n)}>{icon(n)} {t[n]}</button>)}<div className="ad-slot side-ad">PUBLICIDAD<br/><small>Espacio para marcas</small></div></aside>
 <main className="content">
 {tab==='home'&&<section className="home-hero"><div className="hero-copy"><div className="eyebrow">⚡ ONLINE AURA ARENA</div><h1>{t.welcome}</h1><p>Compite en vivo, gana Aura y construye tu reputación.</p><div className="hero-actions"><button className="primary" onClick={()=>setTab('battle')}>⚔️ {t.play}</button><button onClick={()=>setTab('profile')}>👤 Mi perfil</button></div><div className="quick-stats"><Stat label="⚡ Tu Aura" value={profile.aura}/><Stat label="🏆 Victorias" value={profile.wins}/><Stat label="🔥 Nivel" value={profile.level}/></div></div><div className="hero-art"><img src="/assets/aura-arena-home.png" alt="AURA BATTLE Arena"/><div className="hero-glow">LIVE</div></div><div className="home-grid"><Card icon="⚔️" title="Batallas 1v1" text="Crea una sala y reta a otra persona con cámara." action={()=>setTab('battle')}/><Card icon="🤖" title="IA Aura" text="Convierte señales visuales de tu cámara en una métrica de Aura." action={()=>setTab('ai')}/><Card icon="🏆" title="Ranking global" text="Sube posiciones con tus victorias y puntuación." action={()=>setTab('ranking')}/><Card icon="🛡️" title="Clanes" text="Forma equipos y crea una comunidad alrededor de tu Aura." action={()=>setTab('clans')}/></div><div className="ad-slot banner-ad">ESPACIO PUBLICITARIO · AURA BATTLE</div></section>}
 {tab==='profile'&&<Panel title="👤 Mi perfil"><div className="profile-head"><div className="big-profile-icon">⚡</div><div><h2>{user.displayName||'Jugador'}</h2><p>{user.email}</p><span className="badge">Nivel {profile.level}</span></div></div><div className="stats"><Stat label="Aura" value={profile.aura}/><Stat label="Victorias" value={profile.wins}/><Stat label="Derrotas" value={profile.losses}/><Stat label="Ratio" value={`${profile.wins+profile.losses?Math.round(profile.wins/(profile.wins+profile.losses)*100):0}%`}/></div><div className="profile-actions"><button className="primary" onClick={()=>setTab('battle')}>⚔️ Ir a batallar</button><button onClick={()=>setTab('settings')}>⚙️ Ajustes</button></div></Panel>}
 {tab==='friends'&&<Panel title="👥 Amigos"><p>Encuentra jugadores y añade rivales a tu red.</p><div className="inline"><input placeholder="Nombre del jugador" value={friendSearch} onChange={e=>setFriendSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchFriends()}/><button onClick={searchFriends}>🔎 Buscar</button></div>{friendResults.length>0&&<div className="list">{friendResults.map(f=><div className="list-row" key={f.id}>🧑 <span>{f.name}<small>⚡ {f.aura}</small></span><button onClick={()=>addFriend(f)}>＋ Añadir</button></div>)}</div>}<div className="section-title">Mis amigos</div><div className="list">{friends.length?friends.map(f=><div className="list-row" key={f.id}>🟢 {f.name}<span>⚡ {f.aura}</span></div>):<div className="empty">Todavía no tienes amigos. Busca un jugador arriba.</div>}</div></Panel>}
 {tab==='chat'&&<Panel title="💬 Chat global"><div className="chat-box">{chat.length?chat.map(m=><div className={m.uid===user.uid?'bubble mine':'bubble'} key={m.id}><strong>{m.name}</strong><span>{m.text}</span></div>):<div className="empty">Sé la primera persona en escribir.</div>}</div><form className="inline" onSubmit={sendChat}><input maxLength={300} value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Escribe un mensaje…"/><button className="primary">Enviar</button></form><small className="small">Chat público de la comunidad. No compartas datos personales.</small></Panel>}
 {tab==='battle'&&<Panel title="⚔️ Batallas 1v1"><div className="battle-intro"><div><h2>Entra a la arena</h2><p>Crea una sala y comparte el código con tu rival, o únete a una sala existente.</p></div><div className="live-dot">● LIVE</div></div><div className="room-card">{!roomCode?<div className="room-actions"><button className="primary" onClick={createRoom}>{t.create}</button><span>o</span><input maxLength={6} placeholder={t.code} value={room} onChange={e=>setRoom(e.target.value.toUpperCase())}/><button onClick={joinRoom}>{t.join}</button></div>:<><div className="room-code">{roomCode}</div><button className="copy-btn" onClick={()=>navigator.clipboard?.writeText(roomCode)}>📋 Copiar código</button><div className="status">{roomStatus}</div><div className="battle-actions"><button onClick={startCamera}>📷 {cameraOn?'CÁMARA ACTIVA':'ACTIVAR CÁMARA'}</button><button className="primary" disabled={!opponentJoined||!cameraOn||!bothCamerasReady} onClick={startBattle}>🔥 {battleStarted?'BATALLA EN CURSO':'INICIAR BATALLA'}</button>{battleStarted&&<button onClick={finishBattle}>🏁 Terminar y guardar resultado</button>}</div></>}</div><div className="video-grid"><VideoCard title={user.displayName||'Jugador 1'} videoRef={videoRef} score={aura} muted/><VideoCard title="Rival" videoRef={remoteVideoRef} score={opponentAura}/></div>{battleStarted&&<div className="battle-banner">🔥 BATALLA ACTIVA · ¡Sube tu Aura! <button className="music-toggle" onClick={()=>setMusicOn(v=>!v)}>{musicOn?'🔊 Música':'🔇 Música'}</button></div>}</Panel>}
 {tab==='ai'&&<Panel title="🤖 IA Aura"><div className="ai-hero"><div><h2>Tu Aura actual</h2><div className="aura-number">{aura}</div><p>La lectura actual es un motor visual local de demostración. Más adelante podemos sustituirlo por un modelo ML especializado.</p></div><div className="ai-orb">⚡</div></div><div className="ai-meter"><div className="meter-fill" style={{width:`${aura}%`}}/></div><button className="primary" onClick={startCamera}>{cameraOn?'✓ Cámara conectada':'📷 Activar cámara'}</button><div className="notice">Consejo: buena iluminación y encuadre estable ayudan a obtener una señal visual más consistente.</div></Panel>}
 {tab==='ranking'&&<Panel title="🏆 Ranking global"><div className="podium"><div>🥈 {leaders[1]?.name||'—'}<b>{leaders[1]?.aura||0}</b></div><div>🥇 {leaders[0]?.name||'—'}<b>{leaders[0]?.aura||0}</b></div><div>🥉 {leaders[2]?.name||'—'}<b>{leaders[2]?.aura||0}</b></div></div><div className="leader-list">{leaders.map((x,i)=><div className="leader" key={x.id}><span>#{i+1} · {x.name}</span><b>⚡ {x.aura}</b></div>)}</div></Panel>}
 {tab==='league'&&<Panel title="🥇 Liga"><div className="league-card"><div className="league-badge">⚡</div><h2>Bronce</h2><p>Gana batallas para subir a Plata, Oro y las divisiones superiores.</p><div className="progress"><span style={{width:`${Math.min(100,(profile.wins*10)%101)}%`}}/></div><small>{profile.wins*10} / 100 puntos de ascenso</small></div><div className="three-col"><Stat label="Temporada" value="01"/><Stat label="Victorias" value={profile.wins}/><Stat label="Nivel" value={profile.level}/></div></Panel>}
 {tab==='clans'&&<Panel title="🛡️ Clanes"><div className="clan-create"><input placeholder="Nombre del clan" value={clanName} onChange={e=>setClanName(e.target.value)}/><input maxLength={6} placeholder="TAG" value={clanTag} onChange={e=>setClanTag(e.target.value.toUpperCase())}/><button className="primary" onClick={createClan}>＋ Crear clan</button></div><div className="section-title">Clanes de la comunidad</div><div className="home-grid">{clans.length?clans.map(c=><div className="clan-card" key={c.id}><div className="clan-tag">[{c.tag}]</div><h3>{c.name}</h3><p>👥 {c.members?.length||0} miembros</p><button onClick={()=>joinClan(c)}>Unirme</button></div>):<div className="empty">Sé el primer clan de la comunidad.</div>}</div></Panel>}
 {tab==='premium'&&<Panel title="💎 Premium"><div className="premium-box"><div className="premium-icon">💎</div><h2>AURA BATTLE Premium</h2><p>Beneficios previstos: cosméticos exclusivos, estadísticas avanzadas, insignias y experiencia sin publicidad.</p><div className="premium-list"><span>✓ Efectos y beneficios exclusivos</span><span>✓ Estadísticas avanzadas</span><span>✓ Insignia Premium</span><span>✓ Sin publicidad</span></div><button className="primary" onClick={()=>setPremium(v=>!v)}>{premium?'✓ Premium demo activado':'Ver beneficios'}</button></div><div className="notice">Los pagos reales todavía no están activados. Antes de cobrar, conectaremos un proveedor de pagos y políticas legales.</div></Panel>}
 {tab==='settings'&&<Panel title="⚙️ Ajustes"><div className="settings-row"><span>Idioma</span><select value={lang} onChange={e=>setLang(e.target.value as Lang)}><option value="es">Español</option><option value="en">English</option><option value="pt">Português</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="it">Italiano</option><option value="tr">Türkçe</option><option value="ja">日本語</option><option value="ko">한국어</option><option value="zh">中文</option></select></div><div className="settings-row"><span>Tema</span><select value={theme} onChange={e=>setTheme(e.target.value as any)}><option value="neon">Neon</option><option value="midnight">Midnight</option></select></div><div className="settings-row"><span>Cuenta</span><button onClick={logout}>Cerrar sesión</button></div><div className="settings-row"><span>Seguridad</span><small>Firebase Authentication activo</small></div><div className="notice">Protege tu contraseña y no compartas códigos privados de salas fuera de la plataforma.</div></Panel>}
 <div className="mobile-bottom-nav">
   {(['home','battle','friends','profile'] as Tab[]).map(n=><button key={n} className={tab===n?'active':''} onClick={()=>{setTab(n);setMobileMore(false)}}><span>{icon(n)}</span><small>{t[n]}</small></button>)}
   <button className={mobileMore?'active':''} onClick={()=>setMobileMore(v=>!v)}><span>☰</span><small>Más</small></button>
 </div>
 {mobileMore&&<div className="mobile-more">{nav.filter(n=>!['home','battle','friends','profile'].includes(n)).map(n=><button key={n} className={tab===n?'active':''} onClick={()=>{setTab(n);setMobileMore(false)}}>{icon(n)} {t[n]}</button>)}</div>}
 </main></div></div>
}

function AuthScreen(p:any){const {authMode,setAuthMode,email,setEmail,password,setPassword,password2,setPassword2,name,setName,authMsg,setAuthMsg,handleAuth,resetPassword,resetSent,lang,setLang,t}=p;return <div className="auth-shell"><div className="auth-brand"><div className="brand">⚡ <span>AURA BATTLE</span><b>V4</b></div><p>La arena donde tu Aura habla por ti.</p></div>{authMode==='choice'?<div className="auth-card"><div className="eyebrow">ONLINE AURA ARENA</div><h1>Entra al combate</h1><p>Compite, gana Aura y descubre quién domina la arena.</p><button className="primary" onClick={()=>setAuthMode('login')}>🔐 {t.login}</button><button onClick={()=>setAuthMode('register')}>📝 {t.register}</button><div className="lang-line">🌎 <select value={lang} onChange={e=>setLang(e.target.value as Lang)}><option value="es">Español</option><option value="en">English</option><option value="pt">Português</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="it">Italiano</option><option value="tr">Türkçe</option><option value="ja">日本語</option><option value="ko">한국어</option><option value="zh">中文</option></select></div></div>:<form className="auth-card" onSubmit={handleAuth}><div className="eyebrow">{authMode==='login'?'ACCESO':'NUEVO JUGADOR'}</div><h1>{authMode==='login'?t.login:t.register}</h1>{authMode==='register'&&<input placeholder="Nombre de jugador" value={name} onChange={e=>setName(e.target.value)} required/>}<input type="email" placeholder="Correo electrónico" value={email} onChange={e=>setEmail(e.target.value)} required/><input type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} required/>{authMode==='register'&&<><input type="password" placeholder="Repite la contraseña" value={password2} onChange={e=>setPassword2(e.target.value)} required/><div className={password2?(password===password2?'match ok':'match bad'):'match'}>{password2?(password===password2?'✓ Las contraseñas coinciden':'✕ Las contraseñas no coinciden'):'Confirmación de contraseña'}</div></>}{authMsg&&<div className="error">{authMsg}</div>}<button className="primary" type="submit">{authMode==='login'?t.login:t.register}</button>{authMode==='login'&&<button type="button" className="link-button" onClick={resetPassword}>¿Olvidaste tu contraseña?</button>}{resetSent&&<div className="success">✓ Revisa tu correo para restablecerla.</div>}<button type="button" onClick={()=>{setAuthMode('choice');setAuthMsg('')}}>← Volver</button></form>}<div className="ad-slot auth-ad">Espacio publicitario · comunidad AURA BATTLE</div></div>}
function icon(n:Tab){return ({home:'🏠',profile:'👤',friends:'👥',chat:'💬',battle:'⚔️',ai:'🤖',ranking:'🏆',league:'🥇',clans:'🛡️',premium:'💎',settings:'⚙️'} as Record<Tab,string>)[n]}
function Panel({title,children}:{title:string;children:ReactNode}){return <section className="panel"><div className="panel-title">{title}</div>{children}</section>}
function Card({icon,title,text,action}:{icon:string;title:string;text:string;action:()=>void}){return <button className="feature" onClick={action}><span>{icon}</span><div><h3>{title}</h3><p>{text}</p></div><b>→</b></button>}
function Stat({label,value}:{label:string;value:string|number}){return <div className="stat"><small>{label}</small><strong>{value}</strong></div>}
function VideoCard({title,videoRef,score,muted=false}:{title:string;videoRef:RefObject<HTMLVideoElement|null>;score:number;muted?:boolean}){return <div className="video-card"><h3>{title}</h3><div className="video-frame"><video ref={videoRef} autoPlay playsInline muted={muted}/></div><div className="score-line"><b>⚡ {score}</b><div className="bar"><span style={{width:`${Math.min(100,score)}%`}}/></div></div></div>}
