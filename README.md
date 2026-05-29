# CapitAl — AI-Powered Stock Portfolio Manager

A full-stack portfolio management dashboard with an AI assistant, ML-driven trading signals, and anomaly detection. Built with Node.js/Express, MySQL, Python ML microservices, and a local LLM (Lumina Edge).

---

## Architecture

```
Browser (index.html / chat.html)
    │  fetch() → localhost:3000
    ▼
┌────────────────────────────────────────────────────────┐
│  Node.js Express Server (port 3000)                   │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐ │
│  │ Portfolio  │  │   Stocks   │  │  AI Agent        │ │
│  │ Routes     │  │  Routes    │  │  (LLM-powered)   │ │
│  └────────────┘  └─────┬──────┘  └──────────────────┘ │
│                        │ HTTP                          │
│                        ▼                               │
│              ┌──────────────────┐                      │
│              │ Python ML Server │   (port 5001)        │
│              │  Flask           │                      │
│              └────────┬─────────┘                      │
│                        │                               │
│              ┌─────────▼─────────┐                     │
│              │     MySQL DB      │  portfolio_db       │
│              │  (port 3306)      │                     │
│              └───────────────────┘                     │
│                                                         │
│  LLM: Lumina Edge (port 8090) → fallback → Groq API    │
└────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla HTML/CSS/JS, iziToast notifications |
| **Backend** | Node.js, Express, mysql2 |
| **Database** | MySQL 8.4 |
| **ML Server** | Python 3, Flask, XGBoost, scikit-learn |
| **AI Agent** | Lumina Edge (local LLM) → Groq API fallback |
| **Live Prices** | Yahoo Finance API (`.NS` NSE stocks) |

---

## Project Structure

```
├── backend/
│   ├── server.js              # Express entry point (port 3000)
│   ├── db.js                  # MySQL connection pool
│   ├── routes/
│   │   ├── portfolio.js       # Portfolio CRUD & gains
│   │   ├── stocks.js          # Stocks, live prices, ML proxy
│   │   └── agent.js           # AI chat endpoint
│   └── agent/
│       ├── agent.js           # Core agent logic (SQL gen, explanations)
│       ├── luminaClient.js    # LLM client (Lumina → Groq fallback)
│       └── tools.js           # LangChain tools for SQL/procedures
├── frontend/
│   ├── index.html             # Main dashboard
│   ├── chat.html              # AI Assistant chat UI
│   ├── script.js              # Dashboard logic & API calls
│   └── style.css              # Dark theme styles
├── ml_server.py               # Flask server (port 5001)
├── ml_signal.py               # XGBoost BUY/HOLD/SELL classifier
├── lstm_anomaly.py            # Autoencoder anomaly detector
├── db.py                      # Python MySQL connector
├── .env                       # DB & API credentials
├── package.json               # Node dependencies & scripts
├── start.sh                   # Launch MySQL + Node server
└── model.pkl                  # Trained XGBoost model (generated)
```

---

## Database Schema

### Tables

| Table | Columns |
|-------|---------|
| `stocks` | `stock_id` PK, `ticker`, `company_name`, `sector`, `exchange` |
| `portfolios` | `portfolio_id` PK, `name`, `created_at` |
| `transactions` | `transaction_id` PK, `portfolio_id` FK, `stock_id` FK, `shares`, `buy_price`, `buy_date` |
| `price_history` | `price_id` PK, `stock_id` FK, `price_date`, `close_price` |

### Stored Procedures

| Procedure | Description |
|-----------|-------------|
| `GetPortfolioSummary(p_id INT)` | Returns total stocks, shares, and gain/loss for a portfolio |
| `GetBestStock()` | Returns the ticker and return % of the best-performing stock |

### Sample Data

8 Indian NSE stocks: INFY, TCS, HDFC, RELIANCE, WIPRO, MARUTI, HCLTECH, ICICIBANK across Technology, Finance, Energy, and Automotive sectors.

---

## API Reference

### Portfolio

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/portfolio/summary/:id` | Aggregate portfolio summary via stored procedure |
| `GET` | `/api/portfolio/best-stock` | Best-performing stock via stored procedure |
| `GET` | `/api/portfolio/gains/:id` | Per-stock gain/loss with current price |
| `POST` | `/api/portfolio/buy` | Record a buy transaction |

### Stocks

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/stocks` | List all stocks |
| `POST` | `/api/stocks/add` | Add a new stock |
| `GET` | `/api/stocks/live` | Live prices from Yahoo Finance (8 NSE stocks) |
| `GET` | `/api/stocks/signals` | ML buy/sell signals (proxied to Python) |
| `GET` | `/api/stocks/anomalies` | ML anomaly detection (proxied to Python) |

### AI Agent

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/agent/chat` | Natural-language query → SQL → explanation |

### Health

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/test` | Returns `{ ok: true }` |

---

## AI Agent

The chat agent (`POST /api/agent/chat`) accepts natural-language questions and:

1. **Keyword matching** — 9 predefined query patterns (best/worst stock, portfolio holdings, gains, sectors, price changes, summary) mapped to hardcoded SQL
2. **LLM fallback** — unrecognized queries are sent to the LLM to dynamically generate a SELECT query
3. **Market mood** — keywords like "market mood" trigger a sentiment analysis of recent prices

**Prompt flow:**
```
User: "Which stock is performing best?"
  → Keyword matched → SQL: ORDER BY close_price DESC LIMIT 1
  → db.query() → LLM explains results in plain English
  → Returns: "HDFC closed at ₹1908.78..."
```

The agent uses a local **Lumina Edge** LLM server (port 8090) with automatic fallback to **Groq API** (`llama-3.3-70b-versatile`) when the local server is unavailable.

---

## ML Models

### Buy/Sell Signals (`ml_signal.py`)

- **Model:** XGBoost `XGBClassifier` (200 trees, max depth 4)
- **Features:** 1d/5d/20d returns, 5/20-day moving averages, MA ratio, RSI (14), MACD
- **Labels:** BUY (future 10d return > 1%), SELL (< -1%), HOLD (otherwise)
- **Training:** 80/20 chronological split, balanced class weights
- **Endpoint:** `GET /api/stocks/signals` → `/ml/signals`

### Anomaly Detection (`lstm_anomaly.py`)

- **Model:** Shallow autoencoder (single hidden layer, 3 neurons, tanh activation)
- **Method:** 100 SGD iterations per ticker on last 10 normalized prices
- **Threshold:** Reconstruction error > 0.1 → anomaly
- **Endpoint:** `GET /api/stocks/anomalies` → `/ml/anomalies`

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Python 3 + pip (pandas, numpy, xgboost, scikit-learn, flask, flask-cors, mysql-connector-python)
- MySQL 8.4
- Lumina Edge (optional — the agent falls back to Groq)
- Groq API key (for fallback)

### 1. Database Setup

```bash
mysql -u root -p
CREATE DATABASE portfolio_db;
USE portfolio_db;
# Run your schema creation script or import from backup
```

### 2. Environment Variables

Create a `.env` file:

```env
DB_PASSWORD=your_mysql_password
GROQ_API_KEY=your_groq_api_key
LUMINA_BASE_URL=http://127.0.0.1:8090/v1
LUMINA_MODEL=Ministral-3-3B-Instruct-2512-4bit
GROQ_MODEL=llama-3.3-70b-versatile
```

### 3. Install & Run

```bash
# Install Node dependencies
npm install

# Start MySQL (if not running)
mysqld --user=root --datadir=/opt/anaconda3/data --port=3306 &

# Start Node server
node backend/server.js               # → localhost:3000

# Start ML server (separate terminal)
python3 ml_server.py                  # → localhost:5001

# Train the XGBoost model (first time)
python3 ml_signal.py

# Or use the all-in-one script
./start.sh
```

### 4. Access

| Page | URL |
|------|-----|
| Dashboard | http://localhost:3000 |
| AI Assistant | http://localhost:3000/chat.html |

---

## npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `node backend/server.js` | Start Node server |
| `npm run ml` | `python3 ml_server.py` | Start Python ML server |
| `npm run ml:train` | `python3 ml_signal.py` | Train XGBoost model |
| `npm run all` | Both servers | Start Node + ML together |

---

## Development Notes

- **CORS** allows origins: `localhost:3000`, `127.0.0.1:3000`, `localhost:5173`
- **Live prices** have a hardcoded fallback if Yahoo Finance is unreachable
- **Watchlist** is stored in `localStorage` (client-side only)
- **Anomaly toasts** are deduplicated per session via an in-memory Set
- **Dashboard auto-refreshes:** live prices (30s), anomalies (60s), market mood (60s)
