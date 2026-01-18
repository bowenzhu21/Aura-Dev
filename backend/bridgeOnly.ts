// Simple bridge server without voice pipeline - for testing
import { HttpBridgeWebSocketServer } from './httpWebsocketServer';

const port = parseInt(process.env.BRIDGE_WS_PORT || '8765');

console.log('Starting standalone bridge server for testing...\n');

const bridgeServer = new HttpBridgeWebSocketServer({
  port,
  onClaudeResponse: (response) => {
    console.log('[bridge] Claude response received:', response);
  },
  onError: (error) => {
    console.error('[bridge] Error:', error);
  },
});

const start = async () => {
  await bridgeServer.start();
  console.log('\n✓ Bridge server ready!');
  console.log('✓ Waiting for connections from codingterminal...\n');
};

const stop = async () => {
  console.log('\nStopping bridge server...');
  await bridgeServer.close();
  process.exit(0);
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

start().catch((error) => {
  console.error('Failed to start bridge server:', error);
  process.exit(1);
});
