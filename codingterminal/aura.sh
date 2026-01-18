#!/bin/bash

# -----------------------------
# Aura Complete System Launcher
# -----------------------------

# Log file for tmux logging
LOG_FILE="logs/claude_session.log"

# Python parser script
PARSER="parser.py"

# Tmux session name
TMUX_SESSION="claude_aura"

# Backend directory (relative to codingterminal)
BACKEND_DIR="../backend"
BACKEND_CLI_DIR="../backend-cli"

# WebSocket URL (optional argument)
WS_URL="${1:-ws://localhost:8765}"

# PIDs for background processes
BACKEND_PID=""
BACKEND_CLI_PID=""
TOKEN_SERVER_PID=""
PARSER_PID=""

# Function to clean up on exit
cleanup() {
    echo ""
    echo "Stopping all services..."

    # Kill parser
    if [ ! -z "$PARSER_PID" ]; then
        kill $PARSER_PID 2>/dev/null
        echo "✓ Parser stopped"
    fi

    # Kill backend
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "✓ Backend stopped"
    fi

    # Kill backend-cli (ngrok relay)
    if [ ! -z "$BACKEND_CLI_PID" ]; then
        kill $BACKEND_CLI_PID 2>/dev/null
        echo "✓ Backend-CLI (ngrok relay) stopped"
    fi

    # Kill token server
    if [ ! -z "$TOKEN_SERVER_PID" ]; then
        kill $TOKEN_SERVER_PID 2>/dev/null
        echo "✓ Token server stopped"
    fi

    # Kill tmux session
    tmux kill-session -t "$TMUX_SESSION" 2>/dev/null
    echo "✓ Claude session stopped"

    # Kill any child processes
    pkill -P $$ 2>/dev/null

    echo "All services stopped."
    exit
}
trap cleanup SIGINT SIGTERM EXIT

echo "========================================"
echo "  🎤 Aura Voice Assistant System"
echo "========================================"
echo ""

# Kill any existing services on our ports
echo "Cleaning up any existing services..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8765 | xargs kill -9 2>/dev/null || true
sleep 1

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "Error: Backend directory not found at $BACKEND_DIR"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm install > /dev/null 2>&1
    cd - > /dev/null
fi

if [ -d "$BACKEND_CLI_DIR" ] && [ ! -d "$BACKEND_CLI_DIR/node_modules" ]; then
    echo "Installing backend-cli dependencies..."
    cd "$BACKEND_CLI_DIR"
    npm install > /dev/null 2>&1
    cd - > /dev/null
fi

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "Error: tmux is not installed. Please install it with: brew install tmux"
    exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install it first."
    exit 1
fi

# Start token server
echo "Starting token server..."
cd "$BACKEND_DIR/token-server"
npm start > /tmp/aura-token-server.log 2>&1 &
TOKEN_SERVER_PID=$!
cd - > /dev/null

# Wait for token server to be ready (check port instead of PID)
for i in {1..10}; do
    if lsof -i:3000 >/dev/null 2>&1; then
        echo "✓ Token server started (PID: $TOKEN_SERVER_PID)"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "✗ Failed to start token server. Check /tmp/aura-token-server.log"
        cat /tmp/aura-token-server.log
        exit 1
    fi
    sleep 0.5
done

# Start backend voice pipeline
echo "Starting backend voice pipeline..."
cd "$BACKEND_DIR"
npm run dev > /tmp/aura-backend.log 2>&1 &
BACKEND_PID=$!
cd - > /dev/null

# Wait for backend to be ready (check port 8765)
for i in {1..15}; do
    if lsof -i:8765 >/dev/null 2>&1; then
        echo "✓ Backend started (PID: $BACKEND_PID)"
        break
    fi
    if [ $i -eq 15 ]; then
        echo "✗ Failed to start backend. Check /tmp/aura-backend.log"
        cat /tmp/aura-backend.log
        exit 1
    fi
    sleep 0.5
done

# Start backend-cli (ngrok relay for TTS responses)
if [ -d "$BACKEND_CLI_DIR" ]; then
    echo "Starting backend-cli (ngrok relay for voice responses)..."
    cd "$BACKEND_CLI_DIR"
    npm run dev:ngrok > /tmp/aura-backend-cli.log 2>&1 &
    BACKEND_CLI_PID=$!
    cd - > /dev/null
    sleep 2

    if ! kill -0 $BACKEND_CLI_PID 2>/dev/null; then
        echo "✗ Failed to start backend-cli. Check /tmp/aura-backend-cli.log"
        exit 1
    fi
    echo "✓ Backend-CLI started (PID: $BACKEND_CLI_PID)"
else
    echo "⚠ backend-cli not found, skipping voice response relay"
fi

# Start the parser
echo "Starting parser with WebSocket URL: $WS_URL"
python3 "$PARSER" "$WS_URL" > /tmp/aura-parser.log 2>&1 &
PARSER_PID=$!
sleep 1

if ! kill -0 $PARSER_PID 2>/dev/null; then
    echo "✗ Failed to start parser"
    cat /tmp/aura-parser.log
    exit 1
fi
echo "✓ Parser started (PID: $PARSER_PID)"

# Kill existing tmux session if it exists
tmux kill-session -t "$TMUX_SESSION" 2>/dev/null

# Start Claude in a tmux session
echo "Starting Claude Code in tmux..."
tmux new-session -d -s "$TMUX_SESSION" claude

# Enable tmux logging using pipe-pane
tmux pipe-pane -t "$TMUX_SESSION" -o "cat >> $LOG_FILE"

echo ""
echo "========================================"
echo "  ✓ All systems ready!"
echo "========================================"
echo ""
echo "Services running:"
echo "  • Token server: http://localhost:3000"
echo "  • Backend bridge: ws://localhost:8765"
echo "  • Voice pipeline: Active (STT)"
echo "  • Voice response relay: Active (TTS)"
echo "  • Parser: Connected"
echo "  • Claude Code: Ready"
echo ""
echo "Instructions:"
echo "  1. Open browser: http://localhost:8080"
echo "  2. Click 'Connect & Start Voice'"
echo "  3. Say 'Hey Aura' to activate"
echo "  4. Ask your coding questions!"
echo ""
echo "Logs:"
echo "  • Backend (STT): /tmp/aura-backend.log"
echo "  • Backend-CLI (TTS): /tmp/aura-backend-cli.log"
echo "  • Token server: /tmp/aura-token-server.log"
echo "  • Parser: /tmp/aura-parser.log"
echo "  • Claude session: logs/claude_session.log"
echo ""
echo "Press Ctrl+C to stop all services"
echo "========================================"
echo ""

# Attach to the tmux session (blocks until user exits)
tmux attach-session -t "$TMUX_SESSION"

# Cleanup is handled by trap
