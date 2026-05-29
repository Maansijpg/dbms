USE portfolio_db;

DROP PROCEDURE IF EXISTS GetBestStock;
DROP PROCEDURE IF EXISTS GetPortfolioSummary;

DELIMITER //

CREATE PROCEDURE GetBestStock()
BEGIN
    SELECT s.ticker, 
           ((ph.close_price - t.buy_price) / t.buy_price * 100) AS return_pct
    FROM transactions t
    JOIN stocks s ON t.stock_id = s.stock_id
    JOIN price_history ph ON s.stock_id = ph.stock_id
    WHERE ph.price_date = (SELECT MAX(price_date) FROM price_history ph2 WHERE ph2.stock_id = s.stock_id)
    ORDER BY return_pct DESC
    LIMIT 1;
END //

CREATE PROCEDURE GetPortfolioSummary(p_id INT)
BEGIN
    SELECT COUNT(DISTINCT t.stock_id) as total_stocks, 
           SUM(t.shares) as total_shares, 
           SUM((ph.close_price - t.buy_price) * t.shares) as total_gain 
    FROM transactions t 
    JOIN price_history ph ON t.stock_id = ph.stock_id 
    WHERE t.portfolio_id = p_id
      AND ph.price_date = (SELECT MAX(price_date) FROM price_history ph2 WHERE ph2.stock_id = t.stock_id);
END //

DELIMITER ;

INSERT INTO portfolios (name, created_at) VALUES ('Main', NOW());
INSERT INTO transactions (portfolio_id, stock_id, shares, buy_price, buy_date) VALUES (1, 1, 10, 100.00, NOW());
