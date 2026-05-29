const db = require('../db');
const { createChatCompletion } = require('./luminaClient');

<<<<<<< HEAD
const groq = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});
=======
const MOOD_KEYWORDS = ['market mood', 'market sentiment', 'how is the market', 'market feeling', 'mood'];
>>>>>>> 243afa2 (fixed bugs)

async function runAgent(userMessage) {
  const msg = userMessage.toLowerCase();
  const schema = `
    Tables:
    - stocks(stock_id, ticker, company_name, sector, exchange)
    - portfolios(portfolio_id, name, created_at)
    - transactions(transaction_id, portfolio_id FK, stock_id FK, shares, buy_price, buy_date)
    - price_history(price_id, stock_id FK, price_date, close_price)
  `;

  if (MOOD_KEYWORDS.some(k => msg.includes(k))) {
    let data;
    try {
      const sql = `SELECT s.ticker, s.company_name, s.sector, ph.close_price
                   FROM price_history ph
                   JOIN stocks s ON ph.stock_id = s.stock_id
                   ORDER BY ph.price_date DESC
                   LIMIT 20`;
      const [rows] = await db.query(sql);
      data = rows;
    } catch (e) {
      return `Sorry, I had trouble querying: ${e.message}`;
    }
    const moodPrompt = `Analyze the following stock data and give a 1-sentence summary of the market mood for my portfolio with an emoji.
    Data: ${JSON.stringify(data)}`;
    const moodResult = await createChatCompletion({
      messages: [{ role: 'user', content: moodPrompt }],
    });
    return moodResult.choices[0].message.content;
  }

  const SQL_MAP = [
    { keywords: ['best', 'top stock', 'highest'], sql: "SELECT s.ticker, s.company_name, ph.close_price FROM price_history ph JOIN stocks s ON ph.stock_id = s.stock_id ORDER BY ph.close_price DESC LIMIT 1" },
    { keywords: ['worst', 'lowest', 'bottom'], sql: "SELECT s.ticker, s.company_name, ph.close_price FROM price_history ph JOIN stocks s ON ph.stock_id = s.stock_id ORDER BY ph.close_price ASC LIMIT 1" },
    { keywords: ['list stock', 'all stock', 'show stock', 'what stock', 'my stock', 'stock i own', 'stock i have', 'which stock'], sql: "SELECT * FROM stocks" },
    { keywords: ['how many stock', 'count stock', 'total stock', 'number of stock', 'how many'], sql: "SELECT COUNT(*) AS count FROM stocks" },
    { keywords: ['portfolio', 'my holding', 'my investment', 'what i own', 'my shares'], sql: "SELECT s.ticker, s.company_name, t.shares, t.buy_price, t.buy_date FROM transactions t JOIN stocks s ON t.stock_id = s.stock_id WHERE t.portfolio_id = 1" },
    { keywords: ['gain', 'profit', 'return', 'how am i doing', 'performance'], sql: "SELECT s.ticker, s.company_name, t.shares, t.buy_price, ph.close_price AS current_price, ROUND((ph.close_price - t.buy_price) * t.shares, 2) AS gain FROM transactions t JOIN stocks s ON t.stock_id = s.stock_id JOIN price_history ph ON ph.stock_id = s.stock_id WHERE t.portfolio_id = 1" },
    { keywords: ['sector', 'industry'], sql: "SELECT sector, COUNT(*) AS count FROM stocks GROUP BY sector ORDER BY count DESC" },
    { keywords: ['price change', 'recent price', 'latest price', 'price history'], sql: "SELECT s.ticker, s.company_name, ph.close_price, ph.price_date FROM price_history ph JOIN stocks s ON ph.stock_id = s.stock_id ORDER BY ph.price_date DESC LIMIT 15" },
    { keywords: ['summary', 'overview', 'total portfolio'], sql: "SELECT COUNT(DISTINCT t.stock_id) AS stock_count, SUM(t.shares) AS total_shares, ROUND(SUM((ph.close_price - t.buy_price) * t.shares), 2) AS total_gain FROM transactions t JOIN price_history ph ON t.stock_id = ph.stock_id WHERE t.portfolio_id = 1 AND ph.price_date = (SELECT MAX(price_date) FROM price_history)" },
  ];

  let sql = null;
  for (const entry of SQL_MAP) {
    if (entry.keywords.some(k => msg.includes(k))) {
      sql = entry.sql;
      break;
    }
  }

  if (!sql) {
    const sqlResponse = await createChatCompletion({
      messages: [
        { role: 'system', content: `You are a MySQL expert. Schema: ${schema}\nWrite ONE SELECT query. No comments, no markdown, no backticks. Just raw SQL. Never use '?' placeholders.` },
        { role: 'user', content: userMessage },
      ],
    });
    sql = sqlResponse.choices[0].message.content.trim()
      .replace(/^```sql\s*|```\s*$/gi, '')
      .replace(/^`|`$/g, '')
      .split('\n').filter(l => !/^\s*--/.test(l)).join('\n')
      .replace(/--.*$/gm, '')
      .replace(/\?\s*/g, '1')
      .trim();
  }

  if (!/^\s*SELECT\s/i.test(sql)) {
    return "I couldn't generate a valid SELECT query. Please rephrase your question.";
  }

  console.log('SQL:', sql);

  let data;
  try {
    const [rows] = await db.query(sql);
    data = rows.slice(0, 20);
  } catch (e) {
    return `Sorry, I had trouble querying: ${e.message}`;
  }

  if (!data || data.length === 0) {
    return "The query ran successfully but returned no results. Try a different question.";
  }

  const explainResponse = await createChatCompletion({
    messages: [
      { role: 'system', content: 'You are a friendly financial advisor explaining portfolio data to a student. Answer in 2-3 friendly sentences.' },
      { role: 'user', content: `User asked: "${userMessage}"\nData returned: ${JSON.stringify(data)}\nExplain the results in plain English.` },
    ],
  });

  return explainResponse.choices[0].message.content;
}

module.exports = { runAgent };
