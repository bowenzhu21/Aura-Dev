# Backend ↔ Codingterminal Bridge Setup

This guide explains how to set up communication between your backend voice pipeline and codingterminal using ngrok.

## Architecture

```
Voice Input → Backend STT → WebSocket Server → ngrok → Codingterminal → Claude Code
Claude Response → Codingterminal → ngrok → WebSocket Server → Backend TTS → Voice Output
```

## Prerequisites

1. **ngrok** - Install from https://ngrok.com/download
2. **Node.js 20+** - For backend
3. **Python 3** - For codingterminal
4. **tmux** - For codingterminal integration

## Setup Steps

### 1. Configure Backend

1. Copy the example environment file:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edit `.env` and fill in your API keys:
   - `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
   - `GEMINI_API_KEY`
   - `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`

3. Set the bridge WebSocket port (default is 8765):
   ```bash
   BRIDGE_WS_PORT=8765
   ```

### 2. Start the Backend

```bash
cd backend
npm install
npm run dev
```

You should see:
```
✓ Bridge WebSocket server listening on port 8765
Starting voice pipeline...
```

### 3. Expose Backend with ngrok

In a new terminal, start ngrok to expose the WebSocket server:

```bash
ngrok tcp 8765
```

You'll see output like:
```
Forwarding    tcp://0.tcp.ngrok.io:12345 -> localhost:8765
```

**Important**: Note the forwarding URL. You'll need to convert it:
- ngrok shows: `tcp://0.tcp.ngrok.io:12345`
- You need: `ws://0.tcp.ngrok.io:12345` (replace `tcp://` with `ws://`)

### 4. Start Codingterminal

In a new terminal, start the codingterminal parser with the ngrok URL:

**Option A**: Command line argument
```bash
cd codingterminal
python parser.py ws://0.tcp.ngrok.io:12345
```

**Option B**: Environment variable
```bash
cd codingterminal
BRIDGE_WS_URL=ws://0.tcp.ngrok.io:12345 python parser.py
```

You should see:
```
Live parser running. Starting fresh.
WebSocket URL: ws://0.tcp.ngrok.io:12345
✓ Connected to websocket server at ws://0.tcp.ngrok.io:12345
✓ Bidirectional mode: sending responses AND receiving queries
```

### 5. Start Claude Code in tmux

Make sure Claude Code is running in a tmux session named `claude_aura`:

```bash
tmux new -s claude_aura
# Inside tmux:
claude-code
```

## Testing the Integration

1. **Talk to your voice assistant**:
   - Say "Hey Aura"
   - Ask a coding question
   - Your transcribed question will be sent to Claude Code

2. **Check the logs**:
   - Backend terminal: Look for `[bridge] Sent transcript to codingterminal`
   - Parser terminal: Look for `📥 Received query from websocket`
   - Parser terminal: Look for `⌨️ Injected query: ...`

3. **Claude's response**:
   - Claude Code will process the query
   - The parser will capture the response
   - The response will be sent back to the backend
   - Backend can optionally convert it to speech

## Local Testing (Without ngrok)

For local testing on the same machine:

1. Start backend (it will listen on `localhost:8765`)
2. Start parser without arguments:
   ```bash
   python parser.py
   ```
   It will connect to `ws://localhost:8765` by default

## Troubleshooting

### Parser can't connect to WebSocket

- Check that the backend is running and the WebSocket server started
- Verify the ngrok URL is correct (should start with `ws://`, not `tcp://`)
- Check if ngrok is still running (ngrok sessions expire on free plan)

### Transcripts not being sent

- Check backend logs for `[bridge] Sent transcript to codingterminal`
- Verify the voice pipeline is receiving audio
- Check if wake word detection is working

### Parser can't inject into Claude Code

- Verify tmux session name is `claude_aura`
- Check if Claude Code is running in that session:
  ```bash
  tmux list-sessions
  ```
- Try manually: `tmux send-keys -t claude_aura "test" Enter`

## Configuration Reference

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BRIDGE_WS_PORT` | WebSocket server port | `8765` |
| `LIVEKIT_URL` | LiveKit server URL | Required |
| `LIVEKIT_API_KEY` | LiveKit API key | Required |
| `LIVEKIT_API_SECRET` | LiveKit API secret | Required |
| `GEMINI_API_KEY` | Gemini API key | Required |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | Required |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice ID | Required |
| `WAKE_PHRASE` | Wake phrase for activation | `hey aura` |
| `SLEEP_PHRASE` | Sleep phrase to stop listening | `bye aura` |

### Codingterminal Configuration

| Method | How to Set |
|--------|------------|
| Command line | `python parser.py ws://your-url` |
| Environment | `BRIDGE_WS_URL=ws://your-url python parser.py` |
| Default | `ws://localhost:8765` |

## ngrok Configuration File (Optional)

Create `~/.ngrok2/ngrok.yml` for persistent configuration:

```yaml
version: "2"
authtoken: your_auth_token_here

tunnels:
  aura-bridge:
    proto: tcp
    addr: 8765
```

Then start with:
```bash
ngrok start aura-bridge
```

## Production Considerations

- ngrok free plan has session limits
- Consider using ngrok paid plan for stable URLs
- Or deploy backend to a cloud service with public WebSocket endpoint
- Add authentication to the WebSocket server for security
- Implement reconnection logic in both backend and parser
