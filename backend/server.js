import express from 'express'
import {createServer} from 'http'
import {Server} from 'socket.io'
import {YSocketIO} from 'y-socket.io/dist/server'

const app = express()
app.use(express.static("public"))
const httpServer = createServer(app)

const io = new Server(httpServer, {
    cors:{
        origin: "*",
        methods: ["GET","POST"]
    }
})

const ySocketIO = new YSocketIO(io)
ySocketIO.initialize()
io.on("connection", (socket) => {
  console.log("user connected:", socket.id)
})

app.get('/health', (req,res)=>{
    res.status(200).json({
        message:"ok",
        success: true
    })
})

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`)
})