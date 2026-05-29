import os
import pandas as pd
import mysql.connector

def run_query(sql):
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password=os.environ.get("DB_PASSWORD", "Root@2707"),
        database="portfolio_db"
    )
    df = pd.read_sql(sql, conn)
    conn.close()
    return df
