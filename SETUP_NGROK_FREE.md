# Backend ↔ Codingterminal Bridge Setup (ngrok FREE Plan)

This guide shows how to connect your backend voice pipeline to codingterminal using **ngrok's free plan** (no credit card required).

## Architecture

```
Voice Input → Backend STT → HTTP WebSocket Server → ngrok HTTP → Codingterminal → Claude Code
```

## Prerequisites

1. **ngrok** - Install from https://ngrok.com/download
2. **Node.js 20+** - For backend
3. **Python 3** - For codingterminal
4. **tmux** - For codingterminal integration

## Quick Start

### 1. Start Backend

```bash
cd backend
npm install
npm run dev
```

Expected output:
```
Starting bridge server...
✓ HTTP Bridge WebSocket server listening on port 8765
✓ WebSocket endpoint: ws://localhost:8765
✓ Health check: http://localhost:8765/
Starting voice pipeline...
```

### 2. Expose with ngrok (FREE - HTTP Tunnel)

In a **new terminal**:

```bash
ngrok http 8765
```

You'll see:
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:8765
```

**Important Notes:**
- Use the `https://` URL (ngrok provides both http and https, use https)
- Change `https://` to `wss://` for WebSocket connection
- Example: `https://abc123.ngrok-free.app` → `wss://abc123.ngrok-free.app`

### 3. Start Codingterminal

In a **new terminal**:

```bash
cd codingterminal
python parser.py wss://abc123.ngrok-free.app
```

Replace `abc123.ngrok-free.app` with your actual ngrok domain.

Expected output:
```
Live parser running. Starting fresh.
WebSocket URL: wss://abc123.ngrok-free.app
✓ Connected to websocket server at wss://abc123.ngrok-free.app
✓ Bidirectional mode: sending responses AND receiving queries
```

### 4. Start Claude Code

Make sure Claude Code is running in a tmux session:

```bash
tmux new -s claude_aura
# Inside tmux:
claude-code
```

## Testing

1. Say "Hey Aura" followed by a coding question
2. Check backend terminal for: `[bridge] Sent transcript to codingterminal`
3. Check parser terminal for: `📥 Received query from websocket`
4. Check parser terminal for: `⌨️ Injected query: ...`

## Local Testing (Same Machine)

If backend and codingterminal are on the same machine:

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start parser (no ngrok needed)
cd codingterminal
python parser.py ws://localhost:8765

# Terminal 3: Start Claude Code in tmux
tmux new -s claude_aura
claude-code
```

## Configuration

### Backend (.env)

Copy and edit the example:
```bash
cd backend
cp .env.example .env
# Edit .env with your API keys
```

Key settings:
- `BRIDGE_WS_PORT=8765` - Port for WebSocket server
- `LIVEKIT_*` - LiveKit credentials
- `GEMINI_API_KEY` - Gemini API key
- `ELEVENLABS_API_KEY` - ElevenLabs API key

### Codingterminal

Three ways to configure the WebSocket URL:

1. **Command line** (recommended):
   ```bash
   python parser.py wss://your-ngrok-url.ngrok-free.app
   ```

2. **Environment variable**:
   ```bash
   BRIDGE_WS_URL=wss://your-ngrok-url.ngrok-free.app python parser.py
   ```

3. **Default** (local):
   ```bash
   python parser.py
   # Uses ws://localhost:8765
   ```

## Troubleshooting

### ngrok "card required" error

If you see this error with `ngrok tcp`, use `ngrok http` instead (which is what this guide uses). HTTP tunnels are free!

### Parser can't connect

1. Check backend is running: Visit `http://localhost:8765/` in browser
2. Verify ngrok URL:
   - Must start with `wss://` (not `ws://` or `https://`)
   - ngrok free sessions expire after a few hours
3. Check firewall settings

### Backend errors

If you see TypeScript errors:
```bash
cd backend
npm install
npm run build
```

### Transcripts not sending

1. Check backend logs for `[bridge] Sent transcript`
2. Verify audio is being captured
3. Test wake word: "Hey Aura"

### Parser can't inject into Claude

1. Verify tmux session:
   ```bash
   tmux list-sessions | grep claude_aura
   ```

2. Test manually:
   ```bash
   tmux send-keys -t claude_aura "test" Enter
   ```

## ngrok Free Plan Limitations

- Session expires after a few hours (restart ngrok to get new URL)
- Random URL each time (unless you upgrade)
- "Visit Site" button shown to users (not relevant for WebSocket)

## Upgrading to ngrok Paid

If you need:
- Persistent URLs
- No session timeouts
- TCP tunnels

Consider upgrading at https://dashboard.ngrok.com/billing

## Alternative: Deploy Backend to Cloud

Instead of ngrok, deploy your backend to:
- **Heroku** - Free tier with custom domain
- **Railway** - Free tier, easy WebSocket support
- **Fly.io** - Free tier, global deployment
- **DigitalOcean App Platform** - $5/month

These services give you a permanent public URL without ngrok.

## Health Check Endpoints

The HTTP server provides health check endpoints:

- `http://localhost:8765/` - Server status
- `http://localhost:8765/status` - Client count

Access via ngrok:
```bash
curl https://your-ngrok-url.ngrok-free.app/status
```

## Next Steps

Once working:
1. Add your API keys to backend/.env
2. Test voice input → Claude Code flow
3. Consider deploying backend for permanent URL
4. Add error handling and reconnection logic
