require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const { router: authRouter } = require('./routes/auth');
const menuRouter = require('./routes/menu');
const tablesRouter = require('./routes/tables');
const ordersRouter = require('./routes/orders');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});
app.set('io', io);

// Sockets: admins join an "admin" room to receive all new orders.
// Customers join a room for their specific table to get status updates on their own order.
io.on('connection', (socket) => {
  socket.on('join:admin', (token) => {
    try {
      jwt.verify(token, JWT_SECRET);
      socket.join('admin');
      socket.emit('joined:admin');
    } catch (e) {
      socket.emit('error', 'Invalid admin token');
    }
  });

  socket.on('join:table', (tableId) => {
    if (typeof tableId === 'string') {
      socket.join(`table:${tableId}`);
    }
  });
});

app.use('/api/auth', authRouter);
app.use('/api/menu', menuRouter);
app.use('/api/tables', tablesRouter);
app.use('/api/orders', ordersRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

server.listen(PORT, () => {
  console.log(`QR Menu backend running on http://localhost:${PORT}`);
});
