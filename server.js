import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })
const rooms = new Map()
const battleTimers = new Map()
const battleCountdownTimers = new Map()

const distPath = path.resolve(__dirname, 'dist')
app.use(express.static(distPath))
app.get('/health', (_req, res) => res.json({ ok: true, service: 'aura-farming-battles-v5-174' }))

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
        const oldCountdown = battleCountdownTimers.get(socket.data.room)
        if (oldCountdown) { clearTimeout(oldCountdown); battleCountdownTimers.delete(socket.data.room) }
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
        const oldCountdown = battleCountdownTimers.get(socket.data.room)
        if (oldCountdown) { clearTimeout(oldCountdown); battleCountdownTimers.delete(socket.data.room) }
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
    if (battleTimers.has(roomCode) || battleCountdownTimers.has(roomCode)) return

    socket.data.battleReady = true
    const readyCount = room.filter(id => io.sockets.sockets.get(id)?.data.battleReady).length
    io.to(roomCode).emit('battle-ready-status', {
      readyCount,
      total: 2,
      ready: room.map(id => ({ id, ready: !!io.sockets.sockets.get(id)?.data.battleReady }))
    })

    // La batalla solo comienza cuando LOS DOS jugadores confirman que están listos.
    if (readyCount !== 2) return

    // Reiniciar el marcador autoritativo antes de cada nueva ronda.
    room.forEach(id => {
      const player = io.sockets.sockets.get(id)
      if (player) player.data.auraScore = 0
    })

    const startsAt = Date.now() + 5000
    io.to(roomCode).emit('battle-countdown', { startsAt })
    const countdownTimer = setTimeout(() => {
      battleCountdownTimers.delete(roomCode)
      const liveRoom = rooms.get(roomCode) || []
      if (liveRoom.length !== 2) {
        liveRoom.forEach(id => {
          const player = io.sockets.sockets.get(id)
          if (player) player.data.battleReady = false
        })
        io.to(roomCode).emit('battle-cancelled', { reason: 'La batalla fue cancelada porque el rival salió de la sala.' })
        return
      }
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
    }, 5000)
    battleCountdownTimers.set(roomCode, countdownTimer)
  })

  socket.on('finish-battle', () => {
    const roomCode = socket.data.room
    const timer = roomCode && battleTimers.get(roomCode)
    const countdownTimer = roomCode && battleCountdownTimers.get(roomCode)
    if (countdownTimer) { clearTimeout(countdownTimer); battleCountdownTimers.delete(roomCode) }
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
    const countdownTimer = battleCountdownTimers.get(roomCode)
    if (countdownTimer) { clearTimeout(countdownTimer); battleCountdownTimers.delete(roomCode) }
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
    const countdownTimer = battleCountdownTimers.get(roomCode)
    if (countdownTimer) { clearTimeout(countdownTimer); battleCountdownTimers.delete(roomCode) }
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


// FCM server-side push support (optional until FIREBASE_SERVICE_ACCOUNT_JSON is configured).
let firebaseAdmin = null
let adminDb = null
let adminMessaging = null
try {
  const { getApps, initializeApp, cert } = await import('firebase-admin/app')
  const { getFirestore: getAdminFirestore } = await import('firebase-admin/firestore')
  const { getMessaging: getAdminMessaging } = await import('firebase-admin/messaging')
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (rawServiceAccount) {
    const serviceAccount = JSON.parse(rawServiceAccount)
    firebaseAdmin = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) })
    adminDb = getAdminFirestore(firebaseAdmin)
    adminMessaging = getAdminMessaging(firebaseAdmin)
    console.log('FCM Admin: enabled')
  } else {
    console.log('FCM Admin: disabled (missing FIREBASE_SERVICE_ACCOUNT_JSON)')
  }
} catch (error) {
  console.error('FCM Admin initialization error:', error?.message || error)
}

app.use(express.json({ limit: '32kb' }))

async function verifyBearerToken(req) {
  if (!firebaseAdmin) throw new Error('push-server-not-configured')
  const authHeader = String(req.headers.authorization || '')
  if (!authHeader.startsWith('Bearer ')) throw new Error('missing-auth-token')
  const { getAuth } = await import('firebase-admin/auth')
  return getAuth(firebaseAdmin).verifyIdToken(authHeader.slice(7))
}

async function getUserPushTokens(uid) {
  if (!adminDb) throw new Error('push-server-not-configured')
  const snap = await adminDb.collection('users').doc(uid).collection('pushTokens').limit(20).get()
  return snap.docs.map(d => String(d.data().token || '')).filter(Boolean)
}

async function sendPushToUser(uid, title, body, data = {}) {
  if (!adminMessaging) return { ok: false, skipped: true, reason: 'push-server-not-configured' }
  const tokens = await getUserPushTokens(uid)
  if (!tokens.length) return { ok: false, skipped: true, reason: 'no-device-token' }
  const response = await adminMessaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [String(k), String(v)])),
    webpush: { fcmOptions: { link: String(data.url || '/') } }
  })
  const stale = []
  response.responses.forEach((r, i) => {
    const code = r.error?.code || ''
    if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) stale.push(tokens[i])
  })
  if (stale.length) {
    const batch = adminDb.batch()
    const snap = await adminDb.collection('users').doc(uid).collection('pushTokens').where('token', 'in', stale.slice(0, 10)).get()
    snap.docs.forEach(d => batch.delete(d.ref))
    await batch.commit().catch(() => {})
  }
  return { ok: true, sent: response.successCount, failed: response.failureCount }
}

app.post('/api/push/notify', async (req, res) => {
  try {
    const decoded = await verifyBearerToken(req)
    const event = String(req.body?.event || '')
    const targetUid = String(req.body?.targetUid || '')
    const refId = String(req.body?.refId || '')
    if (!targetUid || !refId || targetUid === decoded.uid) return res.status(400).json({ ok: false, error: 'invalid-target' })
    const ref = (collection, id) => adminDb.collection(collection).doc(id)
    let title = 'Aura farming battles'
    let body = 'Tienes una nueva notificación.'
    let data = { type: event, url: '/' }

    if (event === 'friend_request') {
      const snap = await ref('friendRequests', refId).get(); const d = snap.data() || {}
      if (!snap.exists || d.senderId !== decoded.uid || d.receiverId !== targetUid || d.status !== 'pending') return res.status(403).json({ ok: false, error: 'event-not-authorized' })
      title = '👥 Nueva solicitud de amistad'; body = `${d.senderName || 'Un jugador'} quiere ser tu amigo.`; data = { type: event, url: '/?tab=friends' }
    } else if (event === 'private_message') {
      const snap = await ref('privateChats', refId).get(); const d = snap.data() || {}
      if (!snap.exists || d.uid !== decoded.uid || !Array.isArray(d.participants) || !d.participants.includes(targetUid)) return res.status(403).json({ ok: false, error: 'event-not-authorized' })
      title = `💬 ${d.name || 'Nuevo mensaje'}`; body = String(d.text || '').slice(0, 120); data = { type: event, url: '/?tab=chat', conversationId: String(d.conversationId || '') }
    } else if (event === 'battle_invite') {
      const snap = await ref('battleInvites', refId).get(); const d = snap.data() || {}
      if (!snap.exists || d.senderId !== decoded.uid || d.receiverId !== targetUid || d.status !== 'pending') return res.status(403).json({ ok: false, error: 'event-not-authorized' })
      title = '⚔️ Invitación de batalla'; body = `${d.senderName || 'Un jugador'} te invitó a una batalla.`; data = { type: event, url: '/?tab=battle', roomCode: String(d.roomCode || '') }
    } else if (event === 'clan_invite') {
      const snap = await ref('clanInvites', refId).get(); const d = snap.data() || {}
      if (!snap.exists || d.senderId !== decoded.uid || d.receiverId !== targetUid || d.kind !== 'invite' || d.status !== 'pending') return res.status(403).json({ ok: false, error: 'event-not-authorized' })
      title = '🛡️ Invitación de clan'; body = `${d.senderName || 'Un jugador'} te invitó a ${d.clanName || 'un clan'}.`; data = { type: event, url: '/?tab=clans', clanId: String(d.clanId || '') }
    } else if (event === 'clan_join_request') {
      const snap = await ref('clanJoinRequests', refId).get(); const d = snap.data() || {}
      const clanSnap = d.clanId ? await ref('clans', String(d.clanId)).get() : null; const clan = clanSnap?.data() || {}
      if (!snap.exists || d.requesterId !== targetUid || d.status !== 'pending' || d.kind === 'invite' || (clan.owner !== decoded.uid && clan.coLeader !== decoded.uid)) return res.status(403).json({ ok: false, error: 'event-not-authorized' })
      title = '🛡️ Nueva solicitud de clan'; body = `${d.requesterName || 'Un jugador'} quiere unirse a ${d.clanName || 'tu clan'}.`; data = { type: event, url: '/?tab=clans', clanId: String(d.clanId || '') }
    } else if (event === 'clan_chat') {
      const snap = await ref('clanChats', refId).get(); const d = snap.data() || {}
      const clanSnap = d.clanId ? await ref('clans', String(d.clanId)).get() : null; const clan = clanSnap?.data() || {}
      if (!snap.exists || d.uid !== decoded.uid || !Array.isArray(clan.members) || !clan.members.includes(decoded.uid) || !clan.members.includes(targetUid)) return res.status(403).json({ ok: false, error: 'event-not-authorized' })
      title = `💬 ${clan.name || 'Chat del clan'}`; body = `${d.name || 'Jugador'}: ${String(d.text || '').slice(0, 100)}`; data = { type: event, url: '/?tab=clans', clanId: String(d.clanId || '') }
    } else {
      return res.status(400).json({ ok: false, error: 'unsupported-event' })
    }

    const result = await sendPushToUser(targetUid, title, body, data)
    res.json(result)
  } catch (error) {
    console.error('FCM event error:', error)
    const code = error?.message || 'push-error'
    res.status(code === 'missing-auth-token' ? 401 : 500).json({ ok: false, error: code })
  }
})

app.post('/api/push/test', async (req, res) => {
  try {
    const decoded = await verifyBearerToken(req)
    const result = await sendPushToUser(decoded.uid, 'Aura farming battles', '🔔 Notificación de prueba recibida correctamente.', { type: 'test', url: '/' })
    res.json(result)
  } catch (error) {
    console.error('FCM test error:', error)
    const code = error?.message || 'push-error'
    res.status(code === 'missing-auth-token' ? 401 : 500).json({ ok: false, error: code })
  }
})

app.post('/api/push/register-check', async (req, res) => {
  try {
    const decoded = await verifyBearerToken(req)
    const token = String(req.body?.token || '')
    if (!token || token.length < 20) return res.status(400).json({ ok: false, error: 'invalid-token' })
    res.json({ ok: true, uid: decoded.uid })
  } catch (error) {
    console.error('FCM register check error:', error)
    res.status(401).json({ ok: false, error: error?.message || 'auth-error' })
  }
})


const port = Number(process.env.PORT) || 3000
server.listen(port, '0.0.0.0', () => {
  console.log(`AURA FARMING BATTLES V5.174.4 listening on port ${port}`)
  console.log(`Serving frontend from ${distPath}`)
})
