#!/usr/bin/env python3
"""
Test script for action selection functionality.
Tests sending action messages to select Claude Code options.
"""

import asyncio
import websockets
import json
import sys

WS_URL = "ws://localhost:8765"

async def send_action_and_listen(action_content):
    """Send an action and listen for response"""
    try:
        async with websockets.connect(WS_URL) as websocket:
            # Send the action
            message = json.dumps({
                "type": "action",
                "content": action_content
            })

            print(f"\n📤 Sending action: {action_content}")
            await websocket.send(message)

            # Listen for responses for a few seconds
            print("👂 Listening for responses...")
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=3.0)
                data = json.loads(response)

                print(f"\n📥 Received response:")
                print(f"   Type: {data.get('type')}")

                if data.get('type') == 'response':
                    content = data.get('content', {})
                    text = content.get('text', '')
                    options = content.get('options', [])

                    print(f"   Text: {text}")
                    if options:
                        print(f"   Options ({len(options)}):")
                        for i, opt in enumerate(options, 1):
                            print(f"      {i}. {opt}")

                elif data.get('type') == 'confirmation':
                    print(f"   ✓ {data.get('content')}")

                elif data.get('type') == 'error':
                    print(f"   Error: {data.get('content')}")

            except asyncio.TimeoutError:
                print("   (No response received within 3 seconds)")

    except ConnectionRefusedError:
        print("❌ Could not connect to WebSocket server")
        print("   Make sure the WebSocket server is running at ws://localhost:8765")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

async def run_test_suite():
    """Run a suite of tests for action selection"""
    print("=" * 60)
    print("Action Selection Test Suite")
    print("=" * 60)

    tests = [
        ("1", "Valid digit"),
        ("2", "Valid digit"),
        ("one", "Valid spelled-out number"),
        ("three", "Valid spelled-out number"),
        ("banana", "Invalid input (should trigger retry)"),
        ("xyz", "Invalid input (should trigger retry)"),
    ]

    for action, description in tests:
        print(f"\n{'─' * 60}")
        print(f"Test: {description}")
        await send_action_and_listen(action)
        await asyncio.sleep(1)  # Brief pause between tests

    print(f"\n{'=' * 60}")
    print("Test suite complete")
    print("=" * 60)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        # Run full test suite
        print("Running full test suite...")
        print("(To test a specific action, use: python test_action.py <action>)")
        asyncio.run(run_test_suite())
    else:
        # Test specific action
        action = " ".join(sys.argv[1:])
        asyncio.run(send_action_and_listen(action))
