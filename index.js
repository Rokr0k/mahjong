const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const { v4: uuidv4 } = require('uuid');

const PORT = parseInt(process.argv[2]) || 80;

const rooms = {};
const games = {};

const initialPai = [
    "f0",
    "f0",
    "f0",
    "f0",
    "f1",
    "f1",
    "f1",
    "f1",
    "f2",
    "f2",
    "f2",
    "f2",
    "f3",
    "f3",
    "f3",
    "f3",
    "y0",
    "y0",
    "y0",
    "y0",
    "y1",
    "y1",
    "y1",
    "y1",
    "y2",
    "y2",
    "y2",
    "y2",
    "w0",
    "w0",
    "w0",
    "w0",
    "w1",
    "w1",
    "w1",
    "w1",
    "w2",
    "w2",
    "w2",
    "w2",
    "w3",
    "w3",
    "w3",
    "w3",
    "w4",
    "w4",
    "w4",
    "w4",
    "w5",
    "w5",
    "w5",
    "w5",
    "w6",
    "w6",
    "w6",
    "w6",
    "w7",
    "w7",
    "w7",
    "w7",
    "w8",
    "w8",
    "w8",
    "w8",
    "s0",
    "s0",
    "s0",
    "s0",
    "s1",
    "s1",
    "s1",
    "s1",
    "s2",
    "s2",
    "s2",
    "s2",
    "s3",
    "s3",
    "s3",
    "s3",
    "s4",
    "s4",
    "s4",
    "s4",
    "s5",
    "s5",
    "s5",
    "s5",
    "s6",
    "s6",
    "s6",
    "s6",
    "s7",
    "s7",
    "s7",
    "s7",
    "s8",
    "s8",
    "s8",
    "s8",
    "t0",
    "t0",
    "t0",
    "t0",
    "t1",
    "t1",
    "t1",
    "t1",
    "t2",
    "t2",
    "t2",
    "t2",
    "t3",
    "t3",
    "t3",
    "t3",
    "t4",
    "t4",
    "t4",
    "t4",
    "t5",
    "t5",
    "t5",
    "t5",
    "t6",
    "t6",
    "t6",
    "t6",
    "t7",
    "t7",
    "t7",
    "t7",
    "t8",
    "t8",
    "t8",
    "t8",
    "h0",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "h7",
];

function paiCompare(a, b) {
    const order = {
        "f": 0,
        "y": 1,
        "w": 2,
        "s": 3,
        "t": 4,
        "h": 5,
    };
    if (order[a[0]] != order[b[0]]) {
        return order[a[0]] - order[b[0]];
    } else {
        return a[1] - b[1];
    }
}

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
    res.render('list', { rooms });
});

app.get('/room', (req, res) => {
    res.render('room', { id: req.query.id, room: rooms[req.query.id] });
});

app.get('/game', (req, res) => {
    res.render('game', { id: req.query.id });
});

io.of("/list").on('connection', socket => {
    socket.on("create room", (name, callback) => {
        const id = uuidv4();
        rooms[id] = { name, members: [] };
        socket.broadcast.emit("new room", id, rooms[id]);
        callback(id);
    });
});

io.of("/room").on('connection', socket => {
    socket.on("join room", id => {
        if (rooms[id]) {
            rooms[id].members.push(socket.id);
            if (rooms[id].members.length < 4) {
                io.of("/list").emit("update room", id, rooms[id].members.length);
                socket.to(rooms[id].members).emit("update members", rooms[id].members.length);
            } else {
                const gameid = uuidv4();
                games[gameid] = { members: [], pai: [...initialPai], shou: [[], [], [], []], score: [0, 0, 0, 0], wins: [0, 0, 0, 0], order: 0 };
                io.of("/room").to(rooms[id].members).emit("start game", gameid);
                delete rooms[id];
                io.of("/list").emit("delete room", id);
            }
        } else {
            socket.disconnect(true);
        }
    });
    socket.on("disconnecting", () => {
        const id = Object.keys(rooms).filter(key => rooms[key].members.includes(socket.id))[0];
        if (id) {
            rooms[id].members.splice(rooms[id].members.findIndex(member => member == socket.id), 1);
            if (rooms[id].members.length > 0) {
                io.of("/list").emit("update room", id, rooms[id].members.length);
                socket.to(rooms[id].members).emit("update members", rooms[id].members.length);
            } else {
                delete rooms[id];
                io.of("/list").emit("delete room", id);
            }
        }
    });
});

io.of("/game").on('connection', socket => {
    socket.on("join game", id => {
        if (games[id]) {
            games[id].members.push(socket.id);
            if (games[id].members.length == 4) {
                games[id].members = games[id].members.map(member => ({ member, order: Math.random() })).sort((a, b) => a.order - b.order).map(item => item.member);
                games[id].pai = games[id].pai.map(hai => ({ hai, order: Math.random() })).sort((a, b) => a.order - b.order).map(item => item.hai);
                for (let i = 0; i < 4; i++) {
                    for (let j = 0; j < 13; j++) {
                        games[id].shou[i].push(games[id].pai.shift());
                    }
                    games[id].shou[i].sort(paiCompare);
                }
                for (const [index, member] of Object.entries(games[id].members)) {
                    io.of("/game").to(member).emit("start game", index, games[id].shou[index]);
                }
            }
        } else {
            socket.disconnect(true);
        }
    });
    socket.on("disconnecting", () => {
        const id = Object.keys(games).filter(key => games[key].members.includes(socket.id))[0];
        if (id) {
            const members = [...games[id].members];
            delete games[id];
            for (const member of members) {
                if (member != socket.id) {
                    io.of("/game").sockets.get(member).disconnect(true);
                }
            }
        }
    });
});

server.listen(PORT, () => console.log(`Open Mahjong on port ${PORT}.`));