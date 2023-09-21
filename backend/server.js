const express = require('express')
const bodyParser = require('body-parser')
const { Server } = require('socket.io')
const socketActions = require('./socketActions')
const cors = require('cors')

const PORT = process.env.PORT || 8000
const SOCKET_PORT = process.env.SOCKET_PORT || 8001

const io = new Server({ // socket-server
    cors: true
})
const app = express()

app.use(cors())
app.use(bodyParser.json())

app.get('/', (req, res) => {
    res.send('Welcome')
})

const emailToSocketMapping = {}
const socketToEmailMapping = {}

io.on('connection', (socket) => {
    console.log('User connected: ', socket.id)

    socket.on(socketActions.JOIN_ROOM_REQ, ({ roomId, email }) => {
        emailToSocketMapping[email] = socket.id
        socketToEmailMapping[socket.id] = email
        socket.join(roomId)
        console.log('User joined room: ', roomId, email)
        socket.emit(socketActions.JOIN_ROOM_SUCCESS_RES, { roomId })
        socket.broadcast.to(roomId).emit(socketActions.NEW_USER_JOINED, { email })
        console.log('list of users: ', emailToSocketMapping)
    })

    socket.on(socketActions.CALL_USER, ({ email, offer:remoteOffer }) => {
        const socketId = emailToSocketMapping[email]
        const from = socketToEmailMapping[socket.id]

        socket.to(socketId).emit(socketActions.INCOMING_CALL, { from, remoteOffer })
    })

    socket.on(socketActions.CALL_ACCEPTED, ({ from, answer }) => {
        const socketId = emailToSocketMapping[from]
        socket.to(socketId).emit(socketActions.CALL_ACCEPTED_RES, { answer })
    })

    socket.on("disconnect", (reason) => {
        const targetEmail = emailToSocketMapping[socket.id]
        const targetSID = socketToEmailMapping[targetEmail]
        delete emailToSocketMapping[targetEmail]
        delete socketToEmailMapping[targetSID]
        console.log('Disconnected user: ', socket.id)
    });
})




app.listen(PORT, () => {
    console.log(`HTTP server listening on: http://localhost:${PORT}`)
})

io.listen(8001)