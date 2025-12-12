// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Supported stocks
const SUPPORTED_STOCKS = ['GOOG', 'TSLA', 'AMZN', 'META', 'NVDA'];

// Initial prices (random)
let prices = {};
SUPPORTED_STOCKS.forEach(ticker => {
  prices[ticker] = 100 + Math.random() * 900; // between 100 and 1000
});

// Map: socket.id -> Set of subscribed tickers
const subscriptions = new Map();

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Socket.IO logic
io.on('connection', (socket) => {
  const email = socket.handshake.query.email || 'Anonymous';
  console.log(`Client connected: ${email} (${socket.id})`);

  // Initialize empty subscription set for this user
  subscriptions.set(socket.id, new Set());

  // Send supported stocks and current prices on connect
  socket.emit('supportedStocks', {
    stocks: SUPPORTED_STOCKS,
    prices: prices
  });

  // Subscribe to a ticker
  socket.on('subscribe', (ticker) => {
    if (!SUPPORTED_STOCKS.includes(ticker)) return;

    const subs = subscriptions.get(socket.id) || new Set();
    subs.add(ticker);
    subscriptions.set(socket.id, subs);

    console.log(`${email} subscribed to ${ticker}`);
    socket.emit('subscribed', {
      ticker,
      price: parseFloat(prices[ticker].toFixed(2))
    });
  });

  // Unsubscribe from a ticker
  socket.on('unsubscribe', (ticker) => {
    const subs = subscriptions.get(socket.id);
    if (!subs) return;

    subs.delete(ticker);
    console.log(`${email} unsubscribed from ${ticker}`);
    socket.emit('unsubscribed', ticker);
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${email} (${socket.id})`);
    subscriptions.delete(socket.id);
  });
});

// Randomly update prices every second
function updatePrices() {
  SUPPORTED_STOCKS.forEach(ticker => {
    const oldPrice = prices[ticker];
    const change = (Math.random() - 0.5) * 5; // -2.5 to +2.5
    let newPrice = oldPrice + change;
    if (newPrice < 10) newPrice = 10; // floor so it doesn't go too low
    prices[ticker] = parseFloat(newPrice.toFixed(2));
  });

  // For each connected user, send updates only for their subscribed tickers
  for (const [socketId, subs] of subscriptions.entries()) {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) continue;

    const payload = [];
    subs.forEach(ticker => {
      payload.push({
        ticker,
        price: prices[ticker]
      });
    });

    if (payload.length > 0) {
      socket.emit('priceUpdate', payload);
    }
  }
}

// Run price update every second
setInterval(updatePrices, 1000);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
