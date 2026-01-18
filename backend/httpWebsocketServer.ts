import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import cors from 'cors';

type ServerConfig = {
  port: number;
  onTranscriptReceived?: (text: string) => void;
  onClaudeResponse?: (response: any) => void;
  onError?: (error: Error) => void;
};

export class HttpBridgeWebSocketServer {
  private app: express.Application;
  private server: http.Server;
  private wss: WebSocketServer;
  private config: ServerConfig;
  private clients: Set<WebSocket> = new Set();

  constructor(config: ServerConfig) {
    this.config = config;
    this.app = express();
    this.setupExpress();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.setupWebSocket();
  }

  private setupExpress(): void {
    this.app.use(cors());
    this.app.use(express.json());

    // Health check endpoint
    this.app.get('/', (req, res) => {
      res.json({
        status: 'ok',
        service: 'Aura Bridge WebSocket Server',
        clients: this.clients.size,
      });
    });

    // Status endpoint
    this.app.get('/status', (req, res) => {
      res.json({
        status: 'running',
        connectedClients: this.clients.size,
      });
    });
  }

  private setupWebSocket(): void {
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

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
      this.config.onError?.(error);
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        console.log(`✓ HTTP Bridge WebSocket server listening on port ${this.config.port}`);
        console.log(`✓ WebSocket endpoint: ws://localhost:${this.config.port}`);
        console.log(`✓ Health check: http://localhost:${this.config.port}/`);
        resolve();
      });
    });
  }

  private handleMessage(message: any, ws: WebSocket): void {
    switch (message.type) {
      case 'query':
        console.log('[bridge] Received query from codingterminal:', message.content || message.query);
        break;

      case 'response':
        console.log('[bridge] Received Claude response from codingterminal');
        this.config.onClaudeResponse?.(message.content);
        break;

      case 'action':
        console.log('[bridge] Received action from codingterminal:', message.content);
        break;

      case 'confirmation':
        console.log('[bridge] Received confirmation from codingterminal:', message.content);
        break;

      default:
        console.warn('[bridge] Unknown message type:', message.type);
    }
  }

  /**
   * Send transcribed text to all connected clients (codingterminal)
   * This sends as type 'query' which will be injected into Claude Code
   */
  sendTranscript(text: string): void {
    const message = JSON.stringify({
      type: 'query',
      content: text,
      query: text,
    });

    this.broadcast(message);
    console.log('[bridge] Sent transcript to codingterminal:', text.substring(0, 60));
  }

  /**
   * Send transcript for display only (browser) - won't be injected into Claude Code
   */
  sendTranscriptDisplay(text: string): void {
    const message = JSON.stringify({
      type: 'transcript',
      content: text,
    });

    this.broadcast(message);
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
        this.server.close(() => {
          console.log('HTTP Bridge WebSocket server closed');
          resolve();
        });
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
