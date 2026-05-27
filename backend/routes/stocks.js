const express = require('express');
const router = express.Router();
const db = require('../db');

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
  try {
    await db.query(
      'INSERT INTO stocks (ticker, company_name, sector, exchange) VALUES (?,?,?,?)',
      [ticker, company_name, sector, exchange]
    );
    res.json({ success: true, message: 'Stock added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
const http = require('http');

function fetchPython(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5001${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

router.get('/signals', async (req, res) => {
  try {
    const data = await fetchPython('/ml/signals');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'ML server not running' });
  }
});

router.get('/anomalies', async (req, res) => {
  try {
    const data = await fetchPython('/ml/anomalies');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'ML server not running' });
  }
});
