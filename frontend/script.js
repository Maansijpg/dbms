const API = 'http://localhost:3000/api';

async function loadGains() {
  const res = await fetch(`${API}/portfolio/gains/1`);
  const data = await res.json();
  const tbody = document.getElementById('gains-body');
  tbody.innerHTML = '';
  data.forEach(row => {
    const gainClass = row.gain_pct >= 0 ? 'green' : 'red';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.company_name}</td>
      <td>${row.ticker}</td>
      <td>${row.shares}</td>
      <td>₹${row.buy_price}</td>
      <td>₹${row.todays_price}</td>
      <td class="${gainClass}">₹${row.total_gain}</td>
      <td class="${gainClass}">${row.gain_pct}%</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadBestStock() {
  try {
    const res = await fetch(`${API}/portfolio/best-stock`);
    const data = await res.json();
    if (data && data.ticker) {
      const sign = data.return_pct >= 0 ? '+' : '';
      document.getElementById('best-val').textContent = `${data.ticker} ${sign}${data.return_pct}%`;
    } else {
      document.getElementById('best-val').textContent = 'No data';
    }
  } catch (e) {
    document.getElementById('best-val').textContent = 'No data';
  }
}

async function loadStocks() {
  const res = await fetch(`${API}/stocks`);
  const data = await res.json();
  const select = document.getElementById('stock-select');
  document.getElementById('total-stocks').textContent = data.length;
  data.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.stock_id;
    opt.textContent = `${s.ticker} – ${s.company_name}`;
    select.appendChild(opt);
  });
}

document.getElementById('buy-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    portfolio_id: 1,
    stock_id: document.getElementById('stock-select').value,
    shares: document.getElementById('shares-input').value,
    buy_price: document.getElementById('price-input').value,
  };
  const res = await fetch(`${API}/portfolio/buy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  document.getElementById('buy-msg').textContent = data.message || data.error;
});

async function loadSignals() {
  try {
    const res = await fetch(`${API}/stocks/signals`);
    const data = await res.json();
    const tbody = document.getElementById('signals-body');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">Need more price history data to generate signals</td></tr>';
      return;
    }
    data.forEach(row => {
      const color = row.Signal === 'BUY' ? 'green' : row.Signal === 'SELL' ? 'red' : '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.ticker}</td>
        <td>${row.date}</td>
        <td>₹${row.close}</td>
        <td class="${color}"><strong>${row.Signal}</strong></td>
        <td>${row.Confidence}%</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    document.getElementById('signals-body').innerHTML = '<tr><td colspan="5">ML server not running</td></tr>';
  }
}

async function loadAnomalies() {
  try {
    const res = await fetch(`${API}/stocks/anomalies`);
    const data = await res.json();
    const tbody = document.getElementById('anomaly-body');
    tbody.innerHTML = '';
    data.forEach(row => {
      const color = row['Anomaly?'] === 'YES' ? 'red' : 'green';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.Ticker}</td>
        <td>${row.Date}</td>
        <td>${row.Error}</td>
        <td class="${color}"><strong>${row['Anomaly?']}</strong></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    document.getElementById('anomaly-body').innerHTML = '<tr><td colspan="4">ML server not running</td></tr>';
  }
}

loadGains();
loadBestStock();
loadStocks();
loadSignals();
loadAnomalies();