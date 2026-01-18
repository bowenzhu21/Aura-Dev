import WebSocket, { WebSocketServer } from 'ws';

type ServerConfig = {
  port: number;
  onTranscriptReceived?: (text: string) => void;
  onClaudeResponse?: (response: any) => void;
  onError?: (error: Error) => void;
};

export class BridgeWebSocketServer {
  private wss: WebSocketServer;
  private config: ServerConfig;
  private clients: Set<WebSocket> = new Set();

  constructor(config: ServerConfig) {
    this.config = config;
    this.wss = new WebSocketServer({ port: config.port });
    this.setupServer();
  }

  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('✓ New client connected to bridge server');
      this.clients.add(ws);

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message, ws);
        } catch (error) {
          console.error('Failed to parse message:', error);
          this.config.onError?.(error as Error);
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected from bridge server');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.config.onError?.(error);
        this.clients.delete(ws);
      });
    });

    this.wss.on('listening', () => {
      console.log(`✓ Bridge WebSocket server listening on port ${this.config.port}`);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
      this.config.onError?.(error);
    });
  }

  private handleMessage(message: any, ws: WebSocket): void {
    switch (message.type) {
      case 'query':
        // Received from codingterminal - this would be if codingterminal sends back queries
        console.log('[bridge] Received query from codingterminal:', message.content || message.query);
        break;

      case 'response':
        // Claude's response from codingterminal
        console.log('[bridge] Received Claude response from codingterminal');
        this.config.onClaudeResponse?.(message.content);
        break;

      case 'action':
        // Action selection from codingterminal
        console.log('[bridge] Received action from codingterminal:', message.content);
        break;

      case 'confirmation':
        // Confirmation from codingterminal
        console.log('[bridge] Received confirmation from codingterminal:', message.content);
        break;

      default:
        console.warn('[bridge] Unknown message type:', message.type);
    }
  }

  /**
   * Send transcribed text to all connected clients (codingterminal)
   */
  sendTranscript(text: string): void {
    const message = JSON.stringify({
      type: 'query',
      content: text,
      query: text, // Include both for compatibility
    });

    this.broadcast(message);
    console.log('[bridge] Sent transcript to codingterminal:', text.substring(0, 60));
  }

  /**
   * Send any message to all connected clients
   */
  broadcast(data: string): void {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  /**
   * Close the server
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      this.clients.forEach((client) => client.close());
      this.clients.clear();
      this.wss.close(() => {
        console.log('Bridge WebSocket server closed');
        resolve();
      });
    });
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }
}
