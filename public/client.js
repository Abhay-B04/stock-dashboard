let socket = null;
let subscribed = {}; // ticker -> last price

// DOM elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const loginSection = document.getElementById('loginSection');
const stockListSection = document.getElementById('stockListSection');
const stockButtonsContainer = document.getElementById('stockButtons');
const userStatus = document.getElementById('userStatus');
const emptyState = document.getElementById('emptyState');
const subscribedGrid = document.getElementById('subscribedGrid');

// Handle login
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  if (!email) return;

  // Update header
  userStatus.textContent = `Logged in as ${email}`;
  // Hide login, show stocks
  loginSection.classList.add('hidden');
  stockListSection.classList.remove('hidden');

  // Connect socket with email as query (simple login simulation)
  socket = io({
    query: { email }
  });

  setupSocketHandlers();
});

// Setup Socket.IO event handlers
function setupSocketHandlers() {
  if (!socket) return;

  socket.on('connect', () => {
    console.log('Connected to server via Socket.IO, id:', socket.id);
  });

  // Receive supported stocks + initial prices
  socket.on('supportedStocks', ({ stocks, prices }) => {
    renderStockButtons(stocks, prices);
  });

  // Receive confirmation of subscription
  socket.on('subscribed', ({ ticker, price }) => {
    subscribed[ticker] = price;
    renderSubscribedCards();
  });

  // Receive confirmation of unsubscription
  socket.on('unsubscribed', (ticker) => {
    delete subscribed[ticker];
    renderSubscribedCards();
  });

  // Receive live price updates
  socket.on('priceUpdate', (updates) => {
    updates.forEach(({ ticker, price }) => {
      const oldPrice = subscribed[ticker];
      if (oldPrice === undefined) return; // not subscribed
      subscribed[ticker] = price;
      updateCardPrice(ticker, oldPrice, price);
    });
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });
}

// Render the list of stock buttons for subscribe/unsubscribe
function renderStockButtons(stocks, prices) {
  stockButtonsContainer.innerHTML = '';

  stocks.forEach(ticker => {
    const btn = document.createElement('button');
    btn.className =
      'stock-btn px-3 py-1.5 rounded-full text-xs border border-slate-700/80 bg-slate-900/70 hover:border-sky-500/70 hover:text-sky-200 transition flex items-center gap-1';
    btn.dataset.ticker = ticker;

    const label = document.createElement('span');
    label.textContent = ticker;

    const priceSpan = document.createElement('span');
    priceSpan.className = 'text-[10px] text-slate-400';
    priceSpan.textContent = `₹${prices[ticker].toFixed(2)}`;

    btn.appendChild(label);
    btn.appendChild(priceSpan);

    btn.addEventListener('click', () => {
      if (!socket) return;

      if (subscribed[ticker] !== undefined) {
        // Already subscribed -> unsubscribe
        socket.emit('unsubscribe', ticker);
      } else {
        // Not subscribed -> subscribe
        socket.emit('subscribe', ticker);
      }
      // Small click feedback
      btn.classList.add('scale-95');
      setTimeout(() => btn.classList.remove('scale-95'), 120);
    });

    stockButtonsContainer.appendChild(btn);
  });

  updateStockButtonStyles();
}

// Render subscribed stock cards
function renderSubscribedCards() {
  const tickers = Object.keys(subscribed);

  if (tickers.length === 0) {
    emptyState.classList.remove('hidden');
    subscribedGrid.classList.add('hidden');
    subscribedGrid.innerHTML = '';
    updateStockButtonStyles();
    return;
  }

  emptyState.classList.add('hidden');
  subscribedGrid.classList.remove('hidden');
  subscribedGrid.innerHTML = '';

  tickers.forEach(ticker => {
    const price = subscribed[ticker];

    const card = document.createElement('div');
    card.className =
      'stock-card rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-3 flex flex-col gap-2';

    const topRow = document.createElement('div');
    topRow.className = 'flex items-center justify-between';

    const left = document.createElement('div');
    left.innerHTML = `
      <div class="text-xs text-slate-400">Ticker</div>
      <div class="text-lg font-semibold text-sky-300">${ticker}</div>
    `;

    const right = document.createElement('button');
    right.textContent = 'Unsubscribe';
    right.className =
      'text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border border-slate-700/80 text-slate-300 hover:border-rose-500/80 hover:text-rose-300 transition';
    right.addEventListener('click', () => {
      if (!socket) return;
      socket.emit('unsubscribe', ticker);
    });

    topRow.appendChild(left);
    topRow.appendChild(right);

    const midRow = document.createElement('div');
    midRow.className = 'flex items-baseline justify-between mt-1';

    const priceEl = document.createElement('div');
    priceEl.className = 'flex items-baseline gap-1';
    priceEl.innerHTML = `
      <span class="text-xs text-slate-400">Price</span>
      <span class="text-xl font-bold price-text" data-ticker="${ticker}">₹${price.toFixed(2)}</span>
    `;

    const chip = document.createElement('div');
    chip.className =
      'text-[10px] px-2 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/80';
    chip.textContent = 'Live • 1s interval';

    midRow.appendChild(priceEl);
    midRow.appendChild(chip);

    card.appendChild(topRow);
    card.appendChild(midRow);

    subscribedGrid.appendChild(card);
  });

  updateStockButtonStyles();
}

// Update a single card price with animation based on direction
function updateCardPrice(ticker, oldPrice, newPrice) {
  const el = document.querySelector(`.price-text[data-ticker="${ticker}"]`);
  if (!el) return;

  el.textContent = `₹${newPrice.toFixed(2)}`;

  // Remove previous animation classes
  el.classList.remove('price-up', 'price-down');

  if (newPrice > oldPrice) {
    el.classList.add('price-up');
  } else if (newPrice < oldPrice) {
    el.classList.add('price-down');
  }
}

// Change stock buttons appearance if subscribed
function updateStockButtonStyles() {
  const buttons = document.querySelectorAll('.stock-btn');
  buttons.forEach(btn => {
    const ticker = btn.dataset.ticker;
    const isSub = subscribed[ticker] !== undefined;

    if (isSub) {
      btn.classList.add(
        'bg-sky-600/70',
        'border-sky-400/80',
        'text-slate-50',
        'shadow',
        'shadow-sky-900/70'
      );
      btn.classList.remove('bg-slate-900/70');
    } else {
      btn.classList.remove(
        'bg-sky-600/70',
        'border-sky-400/80',
        'text-slate-50',
        'shadow',
        'shadow-sky-900/70'
      );
      btn.classList.add('bg-slate-900/70');
    }
  });
}
