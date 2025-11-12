// WebSocket manager for event ingestion

const INGESTOR_WS_URL = process.env.NEXT_PUBLIC_INGESTOR_WS_URL || 'ws://localhost:8000';

export interface BehavioralEvent {
  type: 'mousemove' | 'keydown' | 'click';
  timestamp: number;
  x?: number;
  y?: number;
  key?: string;
  target?: string;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  /**
   * Connect to the WebSocket with authentication token
   */
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.token = token;
      const wsUrl = `${INGESTOR_WS_URL}/ws/ingest?token=${encodeURIComponent(token)}`;
      
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.ws = null;
          // Attempt to reconnect if we have a token
          if (this.token && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
              this.connect(this.token!).catch(() => {
                // Silently fail reconnection attempts
              });
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send events batch to the WebSocket
   */
  sendEvents(events: BehavioralEvent[]): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(events));
      } catch (error) {
        console.error('Failed to send events:', error);
      }
    } else {
      console.warn('WebSocket is not connected. Events not sent.');
    }
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.token = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();

