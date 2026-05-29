const express = require('express');
const router = express.Router();
const db = require('../db');
const http = require('http');
const axios = require('axios');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM stocks');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/add', async (req, res) => {
  const { ticker, company_name, sector, exchange } = req.body;
  if (!ticker || !company_name) {
    return res.status(400).json({ error: 'ticker and company_name are required' });
  }
  try {
    await db.query(
      'INSERT INTO stocks (ticker, company_name, sector, exchange) VALUES (?,?,?,?)',
      [ticker.trim().toUpperCase(), company_name, sector, exchange]
    );
    res.json({ success: true, message: 'Stock added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function fetchPython(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5001${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON from ML server')); }
      });
    }).on('error', reject);
  });
}

router.get('/signals', async (req, res) => {
  try {
    const data = await fetchPython('/ml/signals');
    res.json(data);
  } catch (e) {
    res.status(503).json({ error: 'ML server not running. Start with: python3 ml_server.py' });
  }
});

router.get('/anomalies', async (req, res) => {
  try {
    const data = await fetchPython('/ml/anomalies');
    res.json(data);
  } catch (e) {
    res.status(503).json({ error: 'ML server not running. Start with: python3 ml_server.py' });
  }
});

router.get('/live', async (req, res) => {
  try {
    const symbols = ['INFY', 'TCS', 'HDFC', 'RELIANCE', 'WIPRO', 'MARUTI', 'HCLTECH', 'ICICIBANK'];
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?interval=1d`;
        const { data } = await axios.get(url, { timeout: 5000 });
        const meta = data.chart.result[0].meta;
        return {
          ticker: symbol,
          price: meta.regularMarketPrice,
          change: meta.regularMarketChange,
          changePercent: meta.regularMarketChangePercent,
        };
      })
    );
    res.json(results);
  } catch (err) {
    const fallback = [
      { ticker: 'INFY', price: 1686.15, change: 12.50, changePercent: 0.74 },
      { ticker: 'TCS', price: 1639.20, change: -8.30, changePercent: -0.50 },
      { ticker: 'HDFC', price: 1908.78, change: 15.20, changePercent: 0.80 },
      { ticker: 'RELIANCE', price: 1857.79, change: -5.10, changePercent: -0.27 },
      { ticker: 'WIPRO', price: 1622.62, change: 22.40, changePercent: 1.40 },
      { ticker: 'MARUTI', price: 1883.25, change: -3.60, changePercent: -0.19 },
      { ticker: 'HCLTECH', price: 1787.14, change: 18.90, changePercent: 1.07 },
      { ticker: 'ICICIBANK', price: 1682.50, change: 9.80, changePercent: 0.59 },
    ];
    res.json(fallback);
  }
});

module.exports = router;
