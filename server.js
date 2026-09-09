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

const distPath = path.resolve(__dirname, 'dist')
app.use(express.static(distPath))
app.get('/health', (_req, res) => res.json({ ok: true, service: 'aura-battle-v5-152' }))

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
  console.log(`AURA BATTLE V5.152 listening on port ${port}`)
  console.log(`Serving frontend from ${distPath}`)
})
