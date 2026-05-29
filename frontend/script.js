const API = 'http://localhost:3005/api';
const shownAnomalyToasts = new Set();

async function apiFetch(path) {
  try {
    const res = await fetch(`${API}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`API ${path} failed:`, e.message);
    return null;
  }
}

async function loadStocks() {
  const data = await apiFetch('/stocks');
  const stocks = data || [];
  const select = document.getElementById('stock-select');
  const count = document.getElementById('total-stocks');
  count.textContent = stocks.length;

  select.innerHTML = '';
  stocks.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.stock_id;
    opt.textContent = `${s.ticker} – ${s.company_name}`;
    select.appendChild(opt);
  });
}

async function loadGains() {
  const data = await apiFetch('/portfolio/gains/1');
  const rows = data || [];
  const tbody = document.getElementById('gains-body');
  tbody.innerHTML = '';

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">No portfolio data</td></tr>';
    return;
  }

  rows.forEach(row => {
    const gainClass = row.gain_pct >= 0 ? 'green' : 'red';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.company_name}</td>
      <td>${row.ticker}</td>
      <td>${row.shares}</td>
      <td>₹${parseFloat(row.buy_price).toFixed(2)}</td>
      <td>₹${parseFloat(row.todays_price).toFixed(2)}</td>
      <td class="${gainClass}">₹${parseFloat(row.total_gain).toFixed(2)}</td>
      <td class="${gainClass}">${parseFloat(row.gain_pct).toFixed(2)}%</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadBestStock() {
  const data = await apiFetch('/portfolio/best-stock');
  if (data && data.ticker) {
    const pct = parseFloat(data.return_pct || 0);
    const sign = pct >= 0 ? '+' : '';
    document.getElementById('best-val').textContent =
      `${data.ticker} ${sign}${pct.toFixed(2)}%`;
  } else {
    document.getElementById('best-val').textContent = 'No data';
  }
}

async function loadMarketMood() {
  try {
    const res = await fetch(`${API}/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'market mood' }),
    });
    const data = await res.json();
    document.getElementById('mood-val').textContent = data.reply || 'No data';
  } catch {
    document.getElementById('mood-val').textContent = 'Agent offline';
  }
}

document.getElementById('buy-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    portfolio_id: 1,
    stock_id: document.getElementById('stock-select').value,
    shares: parseFloat(document.getElementById('shares-input').value),
    buy_price: parseFloat(document.getElementById('price-input').value),
  };

  if (!body.stock_id || !body.shares || !body.buy_price) {
    document.getElementById('buy-msg').textContent = 'Please fill all fields';
    return;
  }

  try {
    const res = await fetch(`${API}/portfolio/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    document.getElementById('buy-msg').textContent = data.message || data.error;
    if (data.success) {
      setTimeout(() => { loadGains(); loadBestStock(); }, 500);
    }
  } catch {
    document.getElementById('buy-msg').textContent = 'Server not running';
  }
});

async function loadSignals() {
  const data = await apiFetch('/stocks/signals');
  const rows = data || [];
  const tbody = document.getElementById('signals-body');
  tbody.innerHTML = '';

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No signals generated yet</td></tr>';
    return;
  }

  rows.forEach(row => {
    const color = row.Signal === 'BUY' ? 'green' : row.Signal === 'SELL' ? 'red' : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.ticker}</td>
      <td>${row.date}</td>
      <td>₹${parseFloat(row.close).toFixed(2)}</td>
      <td class="${color}"><strong>${row.Signal}</strong></td>
      <td>${parseFloat(row.Confidence).toFixed(2)}%</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadAnomalies() {
  const data = await apiFetch('/stocks/anomalies');
  const rows = data || [];
  const tbody = document.getElementById('anomaly-body');
  tbody.innerHTML = '';

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">No anomalies detected</td></tr>';
    return;
  }

  rows.forEach(row => {
    const isAnomaly = row['Anomaly?'] === 'YES';
    const color = isAnomaly ? 'red' : 'green';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.Ticker}</td>
      <td>${row.Date}</td>
      <td>${parseFloat(row.Error || 0).toFixed(4)}</td>
      <td class="${color}"><strong>${isAnomaly ? 'YES' : 'NO'}</strong></td>
    `;
    tbody.appendChild(tr);

    if (isAnomaly && !shownAnomalyToasts.has(`${row.Ticker}-${row.Date}`) && typeof iziToast !== 'undefined') {
      iziToast.show({
        title: '⚠️ Anomaly Detected',
        message: `${row.Ticker} on ${row.Date}`,
        color: 'red',
        position: 'topRight',
        timeout: 5000,
        progressBar: false,
        layout: 2,
      });
      shownAnomalyToasts.add(`${row.Ticker}-${row.Date}`);
    }
  });
}

async function loadLivePrices() {
  const data = await apiFetch('/stocks/live');
  const rows = data || [];
  const tbody = document.getElementById('prices-body');
  tbody.innerHTML = '';

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">Live prices unavailable</td></tr>';
    return;
  }

  rows.forEach(stock => {
    const changeColor = stock.change >= 0 ? 'green' : 'red';
    const symbol = stock.change >= 0 ? '▲' : '▼';
    const status = stock.change >= 0 ? 'Up' : 'Down';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${stock.ticker}</strong></td>
      <td>₹${parseFloat(stock.price).toFixed(2)}</td>
      <td class="${changeColor}">${symbol} ₹${Math.abs(stock.change).toFixed(2)}</td>
      <td class="${changeColor}">${symbol} ${Math.abs(stock.changePercent).toFixed(2)}%</td>
      <td class="${changeColor}">${status}</td>
    `;
    tbody.appendChild(tr);
  });
}

let watchlist = JSON.parse(localStorage.getItem('capitAl_watchlist')) || [];

async function loadWatchlistDropdown() {
  const select = document.getElementById('watchlist-stock-select');
  const stocks = (await apiFetch('/stocks')) || [];
  select.innerHTML = '<option value="">Add a stock to watch...</option>';
  stocks.filter(s => !watchlist.some(w => w.ticker === s.ticker))
    .forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.ticker;
      opt.textContent = `${s.ticker} – ${s.company_name}`;
      select.appendChild(opt);
    });
}

async function renderWatchlist() {
  const tbody = document.getElementById('watchlist-body');
  tbody.innerHTML = '';

  if (watchlist.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;">No stocks in watchlist.</td></tr>';
    return;
  }

  const livePrices = (await apiFetch('/stocks/live')) || [];

  watchlist.forEach(item => {
    const live = livePrices.find(p => p.ticker === item.ticker) || { price: 0, change: 0, changePercent: 0 };
    const changeColor = live.change >= 0 ? 'green' : 'red';
    const symbol = live.change >= 0 ? '▲' : '▼';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${item.ticker}</strong></td>
      <td>${item.company_name}</td>
      <td>₹${parseFloat(live.price).toFixed(2)}</td>
      <td class="${changeColor}">${symbol} ₹${Math.abs(live.change).toFixed(2)} (${Math.abs(live.changePercent).toFixed(2)}%)</td>
      <td><button onclick="removeFromWatchlist('${item.ticker}')" style="background:#f87171;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function addToWatchlist() {
  const select = document.getElementById('watchlist-stock-select');
  const ticker = select.value;
  if (!ticker) return;
  const stocks = JSON.parse(document.getElementById('stock-select')?.dataset?.stocks || '[]');
  const stock = { ticker, company_name: ticker };
  if (!watchlist.some(item => item.ticker === ticker)) {
    watchlist.push(stock);
    localStorage.setItem('capitAl_watchlist', JSON.stringify(watchlist));
    loadWatchlistDropdown();
    renderWatchlist();
    select.value = '';
  }
}

function removeFromWatchlist(ticker) {
  watchlist = watchlist.filter(item => item.ticker !== ticker);
  localStorage.setItem('capitAl_watchlist', JSON.stringify(watchlist));
  loadWatchlistDropdown();
  renderWatchlist();
}

document.addEventListener('DOMContentLoaded', () => {
  loadStocks();
  loadGains();
  loadBestStock();
  loadSignals();
  loadAnomalies();
  loadLivePrices();
  loadMarketMood();
  loadWatchlistDropdown();
  renderWatchlist();
  document.getElementById('add-to-watchlist')?.addEventListener('click', addToWatchlist);

  setInterval(loadLivePrices, 30000);
  setInterval(loadAnomalies, 60000);
  setInterval(loadMarketMood, 60000);
});
