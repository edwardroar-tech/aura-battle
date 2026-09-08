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
app.get('/health', (_req, res) => res.json({ ok: true, service: 'aura-battle-v4-completa' }))

function makeCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

io.on('connection', (socket) => {
  io.emit('online-count', io.engine.clientsCount)
  socket.on('create', (cb) => {
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
    room.push(socket.id)
    socket.join(roomCode)
    socket.data.room = roomCode
    cb?.({ ok: true, code: roomCode, host: false })
    socket.to(roomCode).emit('peer-joined')
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
