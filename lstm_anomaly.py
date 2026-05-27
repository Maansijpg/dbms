import numpy as np
import pandas as pd
import streamlit as st
from db import run_query

WINDOW = 10
THRESHOLD = 0.1

def get_error(window, encoding_dim=3):
    W1 = np.random.randn(len(window), encoding_dim) * 0.01
    W2 = np.random.randn(encoding_dim, len(window)) * 0.01
    for _ in range(100):
        hidden = np.tanh(W1.T @ window)
        output = np.tanh(W2.T @ hidden)
        error  = output - window
        W2 -= 0.01 * np.outer(hidden, error)
        W1 -= 0.01 * np.outer(window, W2 @ error)
    return np.mean((output - window) ** 2)

@st.cache_data(ttl=86400)
def get_anomalies():
    df = run_query("""
        SELECT s.ticker, ph.price_date, ph.close_price
        FROM price_history ph
        JOIN stocks s ON ph.stock_id = s.stock_id
        ORDER BY s.ticker, ph.price_date
    """)
    results = []

    for ticker in df['ticker'].unique():
        prices = df[df['ticker'] == ticker]['close_price'].values.astype(float)
        
        min_p, max_p = prices.min(), prices.max()
        norm = (prices - min_p) / (max_p - min_p) if max_p != min_p else np.zeros_like(prices)

        last_window = norm[-WINDOW:]
        error = get_error(last_window)

        results.append({
            'Ticker'   : ticker,
            'Date'     : df[df['ticker'] == ticker]['price_date'].iloc[-1],
            'Error'    : 0.0 if np.isnan(error) else round(error, 4),
            'Anomaly?' : 'YES' if error > THRESHOLD else 'Normal',
        })

    return pd.DataFrame(results)