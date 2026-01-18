import WebSocket from 'ws';

// Test script to simulate sending a query to the bridge
const WS_URL = process.env.WS_URL || 'ws://localhost:8765';
const TEST_QUERY = process.argv[2] || 'create a hello world function in Python';

console.log('Testing bridge connection...');
console.log(`Connecting to: ${WS_URL}`);
console.log(`Test query: "${TEST_QUERY}"\n`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✓ Connected to bridge server');

  // Send a test query
  const message = JSON.stringify({
    type: 'query',
    content: TEST_QUERY,
    query: TEST_QUERY,
  });

  ws.send(message);
  console.log('✓ Sent test query to bridge');
  console.log('\nCheck your Claude Code terminal - the query should appear there!\n');

  // Keep connection open for a bit to receive any responses
  setTimeout(() => {
    console.log('Closing connection...');
    ws.close();
  }, 2000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📥 Received from bridge:', message);
  } catch (error) {
    console.log('📥 Received:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});
