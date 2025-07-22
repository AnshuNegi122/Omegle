const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const waitingUsers = [];

app.use(express.static('public'));

io.on('connection', socket => {
  console.log('New user connected:', socket.id);

  // Match with another waiting user
  if (waitingUsers.length > 0) {
    const partner = waitingUsers.pop();
    socket.partner = partner;
    partner.partner = socket;

    socket.emit('partner-found', { partnerId: partner.id });
    partner.emit('partner-found', { partnerId: socket.id });
  } else {
    waitingUsers.push(socket);
  }

  socket.on('signal', data => {
    if (socket.partner) {
      socket.partner.emit('signal', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.partner) {
      socket.partner.emit('partner-disconnected');
      socket.partner.partner = null;
    }
    const index = waitingUsers.indexOf(socket);
    if (index !== -1) waitingUsers.splice(index, 1);
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
