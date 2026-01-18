#!/usr/bin/env python3
"""
Mock test for action selection logic without requiring tmux.
Tests the parse_number function and action handling logic.
"""

import sys
import os

# Add parent directory to path to import from parser
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from parser import parse_number

def test_parse_number():
    """Test the parse_number function with various inputs"""
    print("=" * 60)
    print("Testing parse_number function")
    print("=" * 60)

    test_cases = [
        # (input, expected_output, description)
        ("1", 1, "Single digit"),
        ("5", 5, "Single digit"),
        ("10", 10, "Double digit"),
        ("one", 1, "Spelled out: one"),
        ("two", 2, "Spelled out: two"),
        ("three", 3, "Spelled out: three"),
        ("five", 5, "Spelled out: five"),
        ("ten", 10, "Spelled out: ten"),
        ("ONE", 1, "Uppercase spelled out"),
        ("  2  ", 2, "Number with spaces"),
        ("banana", None, "Invalid: banana"),
        ("xyz", None, "Invalid: xyz"),
        ("1.5", None, "Invalid: decimal"),
        ("", None, "Empty string"),
        ("eleven", None, "Number not in dictionary"),
    ]

    passed = 0
    failed = 0

    for input_val, expected, description in test_cases:
        result = parse_number(input_val)
        status = "✓" if result == expected else "✗"

        expected_str = str(expected) if expected is not None else "None"
        result_str = str(result) if result is not None else "None"

        if result == expected:
            passed += 1
            print(f"{status} {description:30} | Input: '{input_val:10}' | Expected: {expected_str:4} | Got: {result_str}")
        else:
            failed += 1
            print(f"{status} {description:30} | Input: '{input_val:10}' | Expected: {expected_str:4} | Got: {result_str} ⚠️ FAILED")

    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)

    return failed == 0

def simulate_action_handling():
    """Simulate the action handling logic"""
    print("\n" + "=" * 60)
    print("Simulating Action Handling Logic")
    print("=" * 60)

    # Simulate a response with options
    last_response = {
        'data': {
            'text': 'Which programming language do you prefer?',
            'options': ['Python', 'JavaScript', 'Rust', 'Go']
        }
    }

    print(f"\n📋 Current options:")
    print(f"   Question: {last_response['data']['text']}")
    for i, opt in enumerate(last_response['data']['options'], 1):
        print(f"      {i}. {opt}")

    test_actions = ["1", "three", "banana", "10"]

    for action_input in test_actions:
        print(f"\n{'─' * 60}")
        print(f"📥 Received action: '{action_input}'")

        action_num = parse_number(action_input)

        if action_num is not None:
            print(f"✓ Parsed as number: {action_num}")
            down_presses = action_num - 1
            print(f"⌨️  Would inject to tmux: Press Down {down_presses} times, then Enter")

            # Check if number is in valid range
            if 1 <= action_num <= len(last_response['data']['options']):
                selected = last_response['data']['options'][action_num - 1]
                print(f"✓ Valid selection: {selected}")
            else:
                print(f"⚠️  Number {action_num} is out of range (1-{len(last_response['data']['options'])})")
        else:
            print(f"✗ Could not parse '{action_input}' as a number")
            print(f"📤 Would send retry response:")
            print(f"   Text: \"Please provide a number for your choice (you entered '{action_input}' which is not valid). Choose from the options below:\"")
            print(f"   Options: {last_response['data']['options']}")

    print("=" * 60)

if __name__ == "__main__":
    # Test parse_number function
    success = test_parse_number()

    # Simulate action handling
    simulate_action_handling()

    # Exit with appropriate code
    sys.exit(0 if success else 1)
