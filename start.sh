#!/bin/bash
# Start MySQL and the Node.js backend server
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting MySQL..."
mysqld --user=root --datadir=/opt/anaconda3/data --port=3306 > /tmp/mysql.log 2>&1 &
MYSQL_PID=$!
sleep 3

echo "Starting Node server..."
node "$DIR/backend/server.js" &
NODE_PID=$!

echo "MySQL PID: $MYSQL_PID  Node PID: $NODE_PID"
echo "Waiting... (Ctrl+C to stop all)"
wait
