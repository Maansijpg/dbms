const OpenAI = require('openai');
const db = require('../db');

const groq = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

async function runAgent(userMessage) {
  const schema = `
    Tables:
    - stocks(stock_id, ticker, company_name, sector, exchange)
    - portfolios(portfolio_id, name, created_at)
    - transactions(transaction_id, portfolio_id FK, stock_id FK, shares, buy_price, buy_date)
    - price_history(price_id, stock_id FK, price_date, close_price)
  `;

  const sqlResponse = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: `You are a MySQL expert. Schema: ${schema}\nWrite ONE SELECT query to answer the user's question. Reply with ONLY the raw SQL, no markdown, no backticks, no explanation.` },
      { role: 'user', content: userMessage },
    ],
  });

  const sql = sqlResponse.choices[0].message.content.trim();
  console.log('SQL:', sql);

  let data;
  try {
    const [rows] = await db.query(sql);
    data = rows.slice(0, 20);
  } catch (e) {
    return `Sorry, I had trouble querying: ${e.message}`;
  }

  const explainResponse = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You are a friendly financial advisor explaining portfolio data to a student. Answer in 2-3 friendly sentences.' },
      { role: 'user', content: `User asked: "${userMessage}"\nData returned: ${JSON.stringify(data)}\nExplain the results in plain English.` },
    ],
  });

  return explainResponse.choices[0].message.content;
}

module.exports = { runAgent };
