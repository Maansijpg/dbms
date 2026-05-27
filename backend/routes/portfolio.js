const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/summary/:id', async (req, res) => {
  try {
    const [rows] = await db.query('CALL GetPortfolioSummary(?)', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/best-stock', async (req, res) => {
  try {
    const [rows] = await db.query('CALL GetBestStock()');
    res.json(rows[0][0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/gains/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.company_name, s.ticker, t.shares, t.buy_price,
             ph.close_price AS todays_price,
             ROUND((ph.close_price - t.buy_price) * t.shares, 2) AS total_gain,
             ROUND((ph.close_price - t.buy_price) / t.buy_price * 100, 2) AS gain_pct
      FROM transactions t
      JOIN stocks s ON t.stock_id = s.stock_id
      JOIN price_history ph ON t.stock_id = ph.stock_id
      WHERE t.portfolio_id = ?
        AND ph.price_date = (SELECT MAX(price_date) FROM price_history)
      ORDER BY gain_pct DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/buy', async (req, res) => {
  const { portfolio_id, stock_id, shares, buy_price } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'INSERT INTO transactions (portfolio_id, stock_id, shares, buy_price, buy_date) VALUES (?,?,?,?,CURDATE())',
      [portfolio_id, stock_id, shares, buy_price]
    );
    await conn.commit();
    res.json({ success: true, message: '✅ Transaction recorded successfully' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;