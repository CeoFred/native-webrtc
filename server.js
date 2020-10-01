const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

const rooms = {};

io.on("connection", socket => {
    socket.on("join_room", roomID => {
        socket.room = roomID;
        if (rooms[roomID]) {
            rooms[roomID].push(socket.id);
        } else {
            rooms[roomID] = [socket.id];
        }
        const otherUsers = rooms[roomID].filter(id => id !== socket.id);
        if (otherUsers) {
            socket.emit("other_users", otherUsers);
            socket.broadcast.emit('user_joined', socket.id);
        }
    });

    socket.on("offer", payload => {
        io.to(payload.target).emit("offer", payload);
    });

    socket.on("answer", payload => {
        io.to(payload.target).emit("answer", payload);
    });

    socket.on("ice-candidate", incoming => {
        io.to(incoming.target).emit("ice-candidate", incoming);
    });

    socket.on("disconnect",() => {
        if(rooms[socket.room]){
            rooms[socket.room] = rooms[socket.room].filter(user => user !== socket.id)
        }
    });
});


server.listen(8000, () => console.log('server is running on port 8000'));
