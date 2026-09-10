import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })
const rooms = new Map()
const battleTimers = new Map()

const distPath = path.resolve(__dirname, 'dist')
app.use(express.json({ limit: '32kb' }))
app.use(express.static(distPath))
app.get('/health', (_req, res) => res.json({ ok: true, service: 'aura-farming-battles-v5-166' }))

let adminReady = null
function getAdmin(){
  if(adminReady)return adminReady
  try{
    const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    if(!raw)throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON no está configurada en Render.')
    const serviceAccount=JSON.parse(raw)
    const app=initializeApp({credential:cert(serviceAccount),projectId:serviceAccount.project_id||serviceAccount.projectId})
    adminReady={app,auth:getAuth(app),db:getFirestore(app),messaging:getMessaging(app)}
    return adminReady
  }catch(error){
    console.error('Firebase Admin init error:',error)
    adminReady=null
    throw error
  }
}

app.post('/api/push', async (req,res)=>{
  try{
    const authHeader=String(req.headers.authorization||'')
    if(!authHeader.startsWith('Bearer '))return res.status(401).json({ok:false,error:'missing-auth'})
    const {auth,db,messaging}=getAdmin()
    const decoded=await auth.verifyIdToken(authHeader.slice(7))
    const userId=String(req.body?.userId||'')
    const title=String(req.body?.title||'Aura farming battles').slice(0,120)
    const body=String(req.body?.body||'Tienes una nueva notificación.').slice(0,300)
    const url=String(req.body?.url||'/').slice(0,300)
    if(!userId)return res.status(400).json({ok:false,error:'missing-userId'})
    const snap=await db.doc(`users/${userId}`).get()
    if(!snap.exists)return res.status(404).json({ok:false,error:'user-not-found'})
    const data=snap.data()||{}
    const tokens=Array.isArray(data.fcmTokens)?data.fcmTokens.filter(x=>typeof x==='string'&&x):[]
    if(!tokens.length)return res.status(200).json({ok:true,sent:0,reason:'no-tokens'})
    const messages=tokens.slice(0,500).map(token=>({token,notification:{title,body},data:{title,body,url}}))
    const result=await messaging.sendEach(messages)
    let removed=0
    const invalid=[]
    result.responses.forEach((r,i)=>{
      if(!r.success){
        const code=r.error?.code||''
        if(code.includes('registration-token-not-registered')||code.includes('invalid-registration-token'))invalid.push(tokens[i])
      }
    })
    if(invalid.length){
      const remaining=tokens.filter(t=>!invalid.includes(t))
      await db.doc(`users/${userId}`).update({fcmTokens:remaining})
      removed=invalid.length
    }
    console.log('Push result', {from:decoded.uid,to:userId,successCount:result.successCount,failureCount:result.failureCount,removed})
    res.json({ok:true,sent:result.successCount,failed:result.failureCount,removed})
  }catch(error){
    console.error('Push endpoint error:',error)
    res.status(500).json({ok:false,error:error?.message||'push-error'})
  }
})

function makeCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

io.on('connection', (socket) => {
  io.emit('online-count', io.engine.clientsCount)
  socket.on('create', (cb) => {
    if (socket.data.room) {
      const oldRoom = rooms.get(socket.data.room)
      if (oldRoom) {
        const oldTimer = battleTimers.get(socket.data.room)
        if (oldTimer) { clearTimeout(oldTimer); battleTimers.delete(socket.data.room) }
        const remaining = oldRoom.filter(id => id !== socket.id)
        if (remaining.length) {
          rooms.set(socket.data.room, remaining)
          socket.to(socket.data.room).emit('peer-left')
        } else rooms.delete(socket.data.room)
      }
      socket.leave(socket.data.room)
    }
    socket.data.room = null
    socket.data.cameraReady = false
    socket.data.auraScore = 0
    socket.data.battleReady = false
    let roomCode
    do roomCode = makeCode(); while (rooms.has(roomCode))
    rooms.set(roomCode, [socket.id])
    socket.join(roomCode)
    socket.data.room = roomCode
    cb?.({ ok: true, code: roomCode, host: true })
  })

  socket.on('join', (raw, cb) => {
    const roomCode = String(raw || '').trim().toUpperCase()
    const room = rooms.get(roomCode)
    if (!room) return cb?.({ ok: false, error: 'Sala no encontrada.' })
    if (room.length >= 2) return cb?.({ ok: false, error: 'Sala llena.' })
    if (socket.data.room) {
      const oldRoom = rooms.get(socket.data.room)
      if (oldRoom) {
        const oldTimer = battleTimers.get(socket.data.room)
        if (oldTimer) { clearTimeout(oldTimer); battleTimers.delete(socket.data.room) }
        const remaining = oldRoom.filter(id => id !== socket.id)
        if (remaining.length) {
          rooms.set(socket.data.room, remaining)
          socket.to(socket.data.room).emit('peer-left')
        } else rooms.delete(socket.data.room)
      }
      socket.leave(socket.data.room)
    }
    room.push(socket.id)
    socket.join(roomCode)
    socket.data.room = roomCode
    socket.data.cameraReady = false
    socket.data.auraScore = 0
    socket.data.battleReady = false
    cb?.({ ok: true, code: roomCode, host: false })
    socket.to(roomCode).emit('peer-joined')
  })

  socket.on('camera-ready', () => {
    const roomCode = socket.data.room
    const room = roomCode && rooms.get(roomCode)
    if (!room) return
    socket.data.cameraReady = true
    socket.data.battleReady = false
    socket.to(roomCode).emit('peer-camera-ready')
    const readyCount = room.filter(id => io.sockets.sockets.get(id)?.data.cameraReady).length
    if (room.length === 2 && readyCount === 2) io.to(roomCode).emit('both-cameras-ready')
  })

  socket.on('signal', (message) => {
    const room = socket.data.room
    if (room) socket.to(room).emit('signal', message)
  })

  socket.on('battle-ready', () => {
    const roomCode = socket.data.room
    const room = roomCode && rooms.get(roomCode)
    if (!room || room.length !== 2 || !socket.data.cameraReady) return
    if (battleTimers.has(roomCode)) return

    socket.data.battleReady = true
    const readyCount = room.filter(id => io.sockets.sockets.get(id)?.data.battleReady).length
    io.to(roomCode).emit('battle-ready-status', {
      readyCount,
      total: 2,
      ready: room.map(id => ({ id, ready: !!io.sockets.sockets.get(id)?.data.battleReady }))
    })

    // La batalla solo comienza cuando LOS DOS jugadores confirman que están listos.
    if (readyCount !== 2) return

    const endsAt = Date.now() + 15000
    io.to(roomCode).emit('start', { endsAt })
    const timer = setTimeout(() => {
      battleTimers.delete(roomCode)
      const players = rooms.get(roomCode) || []
      const a = Number(io.sockets.sockets.get(players[0])?.data.auraScore) || 0
      const b = Number(io.sockets.sockets.get(players[1])?.data.auraScore) || 0
      io.to(roomCode).emit('battle-ended', { aura1: a, aura2: b, winnerId: a === b ? null : (a > b ? players[0] : players[1]) })
    }, 15000)
    battleTimers.set(roomCode, timer)
  })

  socket.on('finish-battle', () => {
    const roomCode = socket.data.room
    const timer = roomCode && battleTimers.get(roomCode)
    if (!roomCode || !timer) return
    clearTimeout(timer)
    battleTimers.delete(roomCode)
    const players = rooms.get(roomCode) || []
    const a = Number(io.sockets.sockets.get(players[0])?.data.auraScore) || 0
    const b = Number(io.sockets.sockets.get(players[1])?.data.auraScore) || 0
    io.to(roomCode).emit('battle-ended', { aura1: a, aura2: b, winnerId: a === b ? null : (a > b ? players[0] : players[1]) })
    players.forEach(id => { const s = io.sockets.sockets.get(id); if (s) s.data.battleReady = false })
  })

  socket.on('content-violation', ({ reason } = {}) => {
    const roomCode = socket.data.room
    if (!roomCode) return
    const timer = battleTimers.get(roomCode)
    if (timer) { clearTimeout(timer); battleTimers.delete(roomCode) }
    const room = rooms.get(roomCode) || []
    room.forEach(id => {
      const s = io.sockets.sockets.get(id)
      if (s) s.data.battleReady = false
    })
    io.to(roomCode).emit('content-violation', { reason: String(reason || 'Contenido no permitido detectado.') })
  })

  socket.on('aura-score', (score) => {
    const room = socket.data.room
    socket.data.auraScore = Number(score) || 0
    if (room) socket.to(room).emit('opponent-aura', socket.data.auraScore)
  })

  socket.on('disconnect', () => {
    const roomCode = socket.data.room
    if (!roomCode) return
    const room = rooms.get(roomCode)
    const timer = battleTimers.get(roomCode)
    if (timer) { clearTimeout(timer); battleTimers.delete(roomCode) }
    if (!room) return
    const next = room.filter(id => id !== socket.id)
    socket.data.cameraReady = false
    socket.data.battleReady = false
    if (next.length) rooms.set(roomCode, next)
    else rooms.delete(roomCode)
    socket.to(roomCode).emit('peer-left')
    io.emit('online-count', io.engine.clientsCount)
  })
})

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

const port = Number(process.env.PORT) || 3000
server.listen(port, '0.0.0.0', () => {
  console.log(`AURA FARMING BATTLES V5.164.8 listening on port ${port}`)
  console.log(`Serving frontend from ${distPath}`)
})
