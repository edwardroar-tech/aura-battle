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

const distPath = path.resolve(__dirname, 'dist')
app.use(express.static(distPath))
app.get('/health', (_req, res) => res.json({ ok: true, service: 'aura-battle-v4-5-pruebas' }))

function makeCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

io.on('connection', (socket) => {
  io.emit('online-count', io.engine.clientsCount)
  socket.on('create', (cb) => {
    if (socket.data.room) {
      const oldRoom = rooms.get(socket.data.room)
      if (oldRoom) {
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
    cb?.({ ok: true, code: roomCode, host: false })
    socket.to(roomCode).emit('peer-joined')
  })

  socket.on('camera-ready', () => {
    const roomCode = socket.data.room
    const room = roomCode && rooms.get(roomCode)
    if (!room) return
    socket.data.cameraReady = true
    socket.to(roomCode).emit('peer-camera-ready')
    const readyCount = room.filter(id => io.sockets.sockets.get(id)?.data.cameraReady).length
    if (room.length === 2 && readyCount === 2) io.to(roomCode).emit('both-cameras-ready')
  })

  socket.on('signal', (message) => {
    const room = socket.data.room
    if (room) socket.to(room).emit('signal', message)
  })

  socket.on('start', () => {
    const room = socket.data.room
    if (room) io.to(room).emit('start')
  })

  socket.on('aura-score', (score) => {
    const room = socket.data.room
    if (room) socket.to(room).emit('opponent-aura', Number(score) || 0)
  })

  socket.on('disconnect', () => {
    const roomCode = socket.data.room
    if (!roomCode) return
    const room = rooms.get(roomCode)
    if (!room) return
    const next = room.filter(id => id !== socket.id)
    socket.data.cameraReady = false
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
  console.log(`AURA BATTLE V4 listening on port ${port}`)
  console.log(`Serving frontend from ${distPath}`)
})
