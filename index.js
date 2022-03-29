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
        "f": 1,
        "y": 2,
        "w": 3,
        "s": 4,
        "t": 5,
        "h": 6,
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
                socket.broadcast.to(rooms[id].members).emit("update members", rooms[id].members.length);
            } else {
                const gameid = uuidv4();
                games[gameid] = { members: [], pai: [...initialPai], shou: [[], [], [], []], hua: [[], [], [], []], extra: "", thrown: [], stole: [[], [], [], []], score: [0, 0, 0, 0], wins: [0, 0, 0, 0], order: 0, answer: [-1, -1, -1, -1] };
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
                socket.broadcast.to(rooms[id].members).emit("update members", rooms[id].members.length);
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
                }
                for (let i = 0; i < 4; i++) {
                    for (let j = 0; j < 13; j++) {
                        while (games[id].shou[i][j].match(/^h[0-7]$/)) {
                            games[id].hua[i].push(games[id].shou[i][j]);
                            games[id].shou[i].splice(j, 1, games[id].pai.shift());
                        }
                    }
                    games[id].shou[i].sort(paiCompare);
                }
                games[id].extra = games[id].pai.shift();
                while (games[id].extra.match(/^h[0-7]$/)) {
                    games[id].hua[games[id].order].push(games[id].extra);
                    games[id].extra = games[id].pai.shift();
                }
                for (const [index, member] of games[id].members.entries()) {
                    io.of("/game").to(member).emit("start game", index, games[id].shou[index], games[id].hua);
                }
                io.of("/game").to(games[id].members[games[id].order]).emit("your turn", games[id].extra);
            }
        } else {
            socket.disconnect(true);
        }
    });
    socket.on("throw", (gameid, playid, selection) => {
        games[gameid].answer[playid] = selection;
        if (selection < 13) {
            [games[gameid].shou[playid][selection], games[gameid].extra] = [games[gameid].extra, games[gameid].shou[playid][selection]];
        }
        games[gameid].shou[playid].sort(paiCompare);
        socket.broadcast.to(games[gameid].members).emit("question", playid, games[gameid].extra, selection < 13);
    });
    socket.on("answer", (gameid, playid, selection) => {
        games[gameid].answer[playid] = selection;
        if (games[gameid].answer.filter(a => a < 0).length == 0) {
            const precedence = {
                0: 0,
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
                6: 0,
                7: 0,
                8: 0,
                9: 0,
                10: 0,
                11: 0,
                12: 0,
                13: 0,
                15: 2,
                16: 1,
                17: 1,
                18: 1,
                19: 2,
            };
            let choosenOne = games[gameid].order;
            for (let i = 1; i < 4; i++) {
                if (precedence[games[gameid].answer[(games[gameid].order + i) % 4]] > precedence[games[gameid].answer[choosenOne]]) {
                    choosenOne = (games[gameid].order + i) % 4;
                }
            }
            if (choosenOne == games[gameid].order) {
                games[gameid].thrown.push(games[gameid].extra);
                games[gameid].extra = "";
            } else {
                switch (games[gameid].answer[choosenOne]) {
                    case 15:
                        games[gameid].shou[choosenOne].splice(games[gameid].shou[choosenOne].findIndex(hai => hai == games[gameid].extra), 2);
                        games[gameid].stole[choosenOne].push({ type: "p", pai: games[gameid].extra, dir: games[gameid].order - choosenOne });
                        games[gameid].extra = "";
                        break;
                    case 16:
                        games[gameid].shou[choosenOne].splice(games[gameid].shou[choosenOne].findIndex(hai => hai == games[gameid].extra[0] + (games[gameid].extra[1] - -1)), 1);
                        games[gameid].shou[choosenOne].splice(games[gameid].shou[choosenOne].findIndex(hai => hai == games[gameid].extra[0] + (games[gameid].extra[1] - -2)), 1);
                        games[gameid].stole[choosenOne].push({ type: "c", pai: games[gameid].extra[0] + (games[gameid].extra[1] - -1), dir: games[gameid].order - choosenOne });
                        games[gameid].extra = "";
                        break;
                    case 17:
                        games[gameid].shou[choosenOne].splice(games[gameid].shou[choosenOne].findIndex(hai => hai == games[gameid].extra[0] + (games[gameid].extra[1] - 1)), 1);
                        games[gameid].shou[choosenOne].splice(games[gameid].shou[choosenOne].findIndex(hai => hai == games[gameid].extra[0] + (games[gameid].extra[1] - -1)), 1);
                        games[gameid].stole[choosenOne].push({ type: "c", pai: games[gameid].extra, dir: games[gameid].order - choosenOne });
                        games[gameid].extra = "";
                        break;
                    case 18:
                        games[gameid].shou[choosenOne].splice(games[gameid].shou[choosenOne].findIndex(hai => hai == games[gameid].extra[0] + (games[gameid].extra[1] - 2)), 1);
                        games[gameid].shou[choosenOne].splice(games[gameid].shou[choosenOne].findIndex(hai => hai == games[gameid].extra[0] + (games[gameid].extra[1] - 1)), 1);
                        games[gameid].stole[choosenOne].push({ type: "c", pai: games[gameid].extra[0] + (games[gameid].extra[1] - 1), dir: games[gameid].order - choosenOne });
                        games[gameid].extra = "";
                        break;
                    case 19:
                        games[gameid].shou[choosenOne].splice(games[gameid].shou[choosenOne].findIndex(games[gameid].extra), 3);
                        games[gameid].stole[choosenOne].push({ type: "g", pai: games[gameid].extra, dir: games[gameid].order - choosenOne });
                        games[gameid].extra = "";
                        break;
                }
            }
            games[gameid].answer = [-1, -1, -1, -1];
            games[gameid].order = (games[gameid].order + 1) % 4;
            games[gameid].extra = games[gameid].pai.shift();
            while (games[gameid].extra.match(/^h[0-7]$/)) {
                games[gameid].hua[games[gameid].order].push(games[gameid].extra);
                games[gameid].extra = games[gameid].pai.shift();
            }
            for (const [index, member] of games[gameid].members.entries()) {
                io.of("/game").to(member).emit("next turn", games[gameid].shou[index], games[gameid].stole[index], games[gameid].thrown, games[gameid].hua);
            }
            io.of("/game").to(games[gameid].members[games[gameid].order]).emit("your turn", games[gameid].extra);
        }
    });
    socket.on("disconnecting", () => {
        const id = Object.keys(games).filter(key => games[key].members.includes(socket.id))[0];
        if (id) {
            const members = [...games[id].members];
            delete games[id];
            socket.broadcast.to(members).disconnectSockets(true);
        }
    });
});

server.listen(PORT, () => console.log(`Open Mahjong on port ${PORT}.`));