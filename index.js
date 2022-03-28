const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const { v4: uuidv4 } = require('uuid');

const PORT = parseInt(process.argv[2]) || 80;

const rooms = {};

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/index', (req, res) => {
    res.render('index');
});

app.get('/list', (req, res) => {
    res.render('list', {rooms});
});

app.get('/room', (req, res) => {
    res.render('room', { id: req.query.roomid, room: rooms[req.query.roomid] });
});

io.of("/list").on('connection', socket => {
    socket.on("create room", (data, callback) => {
        const id = uuidv4();
        rooms[id] = { ...data, members: [] };
        socket.broadcast.emit("new room", id, rooms[id]);
        callback(id);
    });
});

io.of("/room").on('connection', socket => {
    socket.on("join room", id => {
        if (rooms[id]) {
            rooms[id].members.push(socket.id);
            io.of("/list").emit("update room", id, rooms[id].members.length);
            socket.to(rooms[id].members).emit("update members", rooms[id].members.length);
        } else {
            socket.disconnect(true);
        }
    });
    socket.on("disconnecting", () => {
        const id = Object.keys(rooms).filter(key => rooms[key].members.includes(socket.id))[0];
        if (id) {
            rooms[id].members.splice(rooms[id].members.findIndex(member => member == socket.id), 1);
            if(rooms[id].members.length > 0) {
                io.of("/list").emit("update room", id, rooms[id].members.length);
                socket.to(rooms[id].members).emit("update members", rooms[id].members.length);
            } else {
                delete rooms[id];
                io.of("/list").emit("delete room", id);
            }
        }
    });
});

server.listen(PORT, () => console.log(`Open Mahjong on port ${PORT}.`));