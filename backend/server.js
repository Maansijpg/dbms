require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:3005', 'http://127.0.0.1:3005'] }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/agent', require('./routes/agent'));

app.get('/test', (req, res) => {
  res.json({ ok: true });
});

app.use(express.static('frontend'));

app.get('/', (req, res) => {
  res.send('SentinelPortfolio API is running');
});
app.listen(3005, () => console.log('Server running on http://localhost:3005'));
