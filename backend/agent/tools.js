const db = require('../db');
const { tool } = require('@langchain/core/tools');
const { z } = require('zod');

const runQuery = tool(async ({ sql }) => {
  try {
    const [rows] = await db.query(sql);
    return JSON.stringify(rows.slice(0, 20));
  } catch (e) {
    return `SQL Error: ${e.message}`;
  }
}, {
  name: 'run_query',
  description: 'Run a SELECT SQL query on the portfolio_db database to fetch data.',
  schema: z.object({ sql: z.string().describe('A valid SELECT SQL query') })
});

const callProcedure = tool(async ({ procedure, args }) => {
  try {
    const placeholders = args.map(() => '?').join(',');
    const [rows] = await db.query(`CALL ${procedure}(${placeholders})`, args);
    return JSON.stringify(rows[0]);
  } catch (e) {
    return `Procedure Error: ${e.message}`;
  }
}, {
  name: 'call_procedure',
  description: 'Call a stored procedure. Available: GetPortfolioSummary(portfolio_id INT), GetBestStock(), CursorSummary()',
  schema: z.object({
    procedure: z.string(),
    args: z.array(z.any()).default([])
  })
});

const getSchema = tool(async () => {
  return `
    Database: portfolio_db
    Tables:
    - stocks(stock_id PK, ticker, company_name, sector, exchange)
    - portfolios(portfolio_id PK, name, created_at)
    - transactions(transaction_id PK, portfolio_id FK, stock_id FK, shares, buy_price, buy_date)
    - price_history(price_id PK, stock_id FK, price_date, close_price)
  `;
}, {
  name: 'get_schema',
  description: 'Get the database schema — call this first before writing any SQL query',
  schema: z.object({})
});

module.exports = { runQuery, callProcedure, getSchema };
