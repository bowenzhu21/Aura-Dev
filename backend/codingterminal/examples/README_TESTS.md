# Action Selection Tests

Tests for the action selection feature that allows WebSocket clients to select options in Claude Code via tmux.

## Test Files

### 1. `test_action_mock.py` - Unit/Logic Test

Tests the action parsing logic **without requiring tmux or Claude Code to be running**.

**Usage:**
```bash
python examples/test_action_mock.py
```

**What it tests:**
- `parse_number()` function with various inputs (digits, spelled-out numbers, invalid inputs)
- Action handling logic simulation
- Error response generation
- Range validation

**Output:**
- Shows all test cases with pass/fail status
- Simulates the full action handling flow
- No external dependencies required

---

### 2. `test_action.py` - Integration Test

Tests the **full WebSocket integration** by sending action messages to the running parser.

**Requirements:**
- WebSocket server running at `ws://localhost:8765`
- Parser (`parser.py`) connected to the server
- Claude Code running in tmux session named `claude_aura`

**Usage:**

Run full test suite:
```bash
python examples/test_action.py
```

Test a specific action:
```bash
python examples/test_action.py 1
python examples/test_action.py three
python examples/test_action.py banana
```

**What it tests:**
- Sending action messages via WebSocket
- Receiving responses from parser
- Valid actions (digits and spelled-out numbers)
- Invalid actions (triggers retry response)

---

## How Action Selection Works

### Message Format

Send this JSON to the WebSocket:
```json
{
  "type": "action",
  "content": "1"
}
```

The `content` can be:
- **Digits**: `"1"`, `"2"`, `"3"`, etc.
- **Spelled-out**: `"one"`, `"two"`, `"three"`, etc. (up to "ten")

### Valid Action Flow

1. Client sends: `{"type": "action", "content": "2"}`
2. Parser parses "2" as number `2`
3. Parser navigates to option 2 by pressing Down (2-1 = 1 time)
4. Parser sends Enter: `tmux send-keys -t claude_aura "Enter"`
5. Claude Code receives the selection
6. Parser sends confirmation back: `{"type": "confirmation", "content": "Action received"}`

### Invalid Action Flow

1. Client sends: `{"type": "action", "content": "banana"}`
2. Parser cannot parse "banana" as a number
3. Parser sends retry response:
   ```json
   {
     "type": "response",
     "content": {
       "text": "Please provide a number for your choice (you entered 'banana' which is not valid). Choose from the options below:",
       "options": ["Option 1", "Option 2", "Option 3"]
     }
   }
   ```

---

## Prerequisites for Integration Testing

### 1. Start tmux session
```bash
tmux new -s claude_aura
```

### 2. Run Claude Code inside tmux
```bash
# Inside the tmux session
claude-code
```

### 3. Start WebSocket server
```bash
# In another terminal
python examples/websocket_server.py
```

### 4. Start parser
```bash
# In another terminal
python parser.py
```

### 5. Run tests
```bash
# In another terminal
python examples/test_action.py
```

---

## Troubleshooting

**Parser can't inject to tmux:**
- Verify tmux session exists: `tmux ls`
- Check session name matches `TMUX_SESSION` in parser.py (default: `claude_aura`)
- Ensure tmux is installed: `brew install tmux` (macOS)

**WebSocket connection refused:**
- Verify WebSocket server is running on port 8765
- Check `WS_URL` in test scripts matches your server

**Action not working:**
- Verify Claude Code is showing options (numbered list)
- Check parser logs for "Received action from websocket"
- Verify parser logs show "Selected action: N"
