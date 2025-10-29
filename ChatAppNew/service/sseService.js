import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './api';

/**
 * Server-Sent Events Service for Real-time Chat
 * This service connects to the backend SSE endpoint to receive real-time messages
 */
class SSEService {
  constructor() {
    this.eventSource = null;
    this.isConnected = false;
    this.currentUserId = null;
    this.messageHandlers = new Set();
    this.connectionHandlers = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // 2 seconds
    this.manuallyDisconnected = false;
  }

  // Initialize SSE connection
  async connect() {
    try {
      // Get current user ID
      const userToken = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (!userToken || !userData) {
        console.log('❌ SSE: No user data found');
        return false;
      }

      const user = JSON.parse(userData);
      this.currentUserId = user._id || user.id;

      if (!this.currentUserId) {
        console.log('❌ SSE: No user ID found');
        return false;
      }

      // Close existing connection
      this.disconnect();

      console.log('📡 SSE: Connecting for user:', this.currentUserId);
      
      // Note: React Native doesn't have native EventSource, we'll use fetch with streaming
      this.manuallyDisconnected = false;
      await this.createConnection();

      return true;
    } catch (error) {
      console.error('❌ SSE Connection error:', error);
      return false;
    }
  }

  // Create the actual SSE connection using fetch streaming
  async createConnection() {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const url = `${API_URL}/sse/connect/${this.currentUserId}`;
      
      console.log('📡 SSE: Creating connection to:', url);

      // Use fetch with streaming for SSE in React Native
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      console.log('✅ SSE: Connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Notify connection handlers
      this.connectionHandlers.forEach(handler => {
        try {
          handler(true);
        } catch (error) {
          console.error('Error in connection handler:', error);
        }
      });

      // Read the stream
      this.readStream(response);

    } catch (error) {
      console.error('❌ SSE: Connection failed:', error);
      this.handleConnectionError();
    }
  }

  // Read the SSE stream
  async readStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (this.isConnected && !this.manuallyDisconnected) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('📡 SSE: Stream ended');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              this.handleMessage(data);
            } catch (error) {
              console.error('❌ SSE: Error parsing message:', error, line);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ SSE: Stream read error:', error);
    } finally {
      reader.releaseLock();
      if (!this.manuallyDisconnected) {
        this.handleConnectionError();
      }
    }
  }

  // Handle incoming SSE messages
  handleMessage(data) {
    console.log('📨 SSE: Received message:', data.type, data);

    // Notify message handlers
    this.messageHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  // Handle connection errors and attempt reconnection
  handleConnectionError() {
    this.isConnected = false;

    // Notify connection handlers
    this.connectionHandlers.forEach(handler => {
      try {
        handler(false);
      } catch (error) {
        console.error('Error in connection handler:', error);
      }
    });

    // Attempt reconnection if not manually disconnected
    if (!this.manuallyDisconnected && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 SSE: Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
      
      setTimeout(() => {
        if (!this.manuallyDisconnected) {
          this.createConnection();
        }
      }, this.reconnectDelay);
      
      // Exponential backoff
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ SSE: Max reconnection attempts reached');
    }
  }

  // Disconnect SSE
  disconnect() {
    console.log('📡 SSE: Disconnecting...');
    this.manuallyDisconnected = true;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 2000;
    
    // Note: In a real EventSource implementation, we would call eventSource.close()
    // For our fetch-based implementation, the connection will be closed when the component unmounts
  }

  // Join a chat room
  async joinRoom(roomId) {
    if (!this.currentUserId || !roomId) {
      console.log('❌ SSE: Cannot join room - missing user ID or room ID');
      return false;
    }

    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/sse/join-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          userId: this.currentUserId,
          roomId: roomId
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log('🏠 SSE: Joined room:', roomId);
        return true;
      } else {
        console.error('❌ SSE: Failed to join room:', result);
        return false;
      }
    } catch (error) {
      console.error('❌ SSE: Error joining room:', error);
      return false;
    }
  }

  // Leave a chat room
  async leaveRoom(roomId) {
    if (!this.currentUserId || !roomId) {
      console.log('❌ SSE: Cannot leave room - missing user ID or room ID');
      return false;
    }

    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/sse/leave-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          userId: this.currentUserId,
          roomId: roomId
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log('🚪 SSE: Left room:', roomId);
        return true;
      } else {
        console.error('❌ SSE: Failed to leave room:', result);
        return false;
      }
    } catch (error) {
      console.error('❌ SSE: Error leaving room:', error);
      return false;
    }
  }

  // Add message event handler
  onMessage(handler) {
    this.messageHandlers.add(handler);
    
    // Return cleanup function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  // Add connection status handler
  onConnectionChange(handler) {
    this.connectionHandlers.add(handler);
    
    // Return cleanup function
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      userId: this.currentUserId,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Create singleton instance
const sseService = new SSEService();

export default sseService;