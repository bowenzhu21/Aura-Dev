// Test script to simulate voice transcript being sent to bridge
import WebSocket from 'ws';

const WS_URL = 'ws://localhost:8765';
const TEST_TRANSCRIPT = process.argv[2] || 'test voice transcript';

console.log('Simulating voice transcript...');
console.log(`Transcript: "${TEST_TRANSCRIPT}"`);

// Connect to bridge as the voice pipeline would
const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✓ Connected to bridge as voice pipeline');

  // Send transcript (this simulates what runPipeline does via bridgeServer.sendTranscript)
  // But we need to send it the way the bridge expects...
  // Actually, the bridge should broadcast, not receive from us

  // Close and let the real backend do it
  ws.close();

  console.log('\nThe issue is: test-bridge connects AS a client');
  console.log('But it should simulate the BACKEND calling bridge.sendTranscript()');
  console.log('\nFor real testing, you need to:');
  console.log('1. Speak into the browser');
  console.log('2. Backend receives audio from LiveKit');
  console.log('3. Backend calls bridgeServer.sendTranscript(text)');
  console.log('4. Bridge broadcasts to parser');
  console.log('5. Parser injects into Claude Code');

  process.exit(0);
});
