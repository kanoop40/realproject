import io from 'socket.io-client';
import { getToken } from './auth';

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: {
    token: getToken()
  },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000
});

// Socket event listeners
export const initializeSocketListeners = (dispatch) => {
  // Connection events
  socket.on('connect', () => {
    console.log('Socket connected');
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    dispatch({ 
      type: 'SET_ERROR', 
      payload: { type: 'connection', message: error.message }
    });
  });

  // Message events
  socket.on('new_message', ({ message, timestamp }) => {
    if (!message || !message._id) {
      console.error('Invalid message format received');
      return;
    }
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  });

  socket.on('messages_read', ({ chatId, userId, messageIds }) => {
    if (!chatId || !userId || !Array.isArray(messageIds)) {
      console.error('Invalid read status format received');
      return;
    }
    dispatch({
      type: 'UPDATE_READ_STATUS',
      payload: { chatId, userId, messageIds }
    });
  });

  // Typing events
  socket.on('typing_update', ({ chatId, users }) => {
    if (!chatId || !Array.isArray(users)) {
      console.error('Invalid typing update format received');
      return;
    }
    dispatch({
      type: 'UPDATE_TYPING_STATUS',
      payload: { chatId, users }
    });
  });

  // User status events
  socket.on('user_status', ({ userId, status, timestamp }) => {
    if (!userId || typeof status === 'undefined') {
      console.error('Invalid user status format received');
      return;
    }
    dispatch({
      type: 'UPDATE_USER_STATUS',
      payload: { userId, status, timestamp }
    });
  });

  // Error events
  socket.on('error', ({ message, error }) => {
    console.error('Socket error:', message, error);
    dispatch({
      type: 'SET_ERROR',
      payload: { type: 'socket', message: message || 'Unknown socket error' }
    });
  });

  // Reconnect events
  socket.io.on('reconnect_attempt', (attempt) => {
    console.log(`Socket reconnection attempt ${attempt}`);
  });

  socket.io.on('reconnect', (attempt) => {
    console.log(`Socket reconnected after ${attempt} attempts`);
    // Rejoin chats after reconnection
    const activeChats = dispatch({ type: 'GET_ACTIVE_CHATS' });
    if (Array.isArray(activeChats)) {
      socketEvents.joinChats(activeChats);
    }
  });
};

// Socket event emitters
export const socketEvents = {
  joinChats: (chatIds) => {
    if (!Array.isArray(chatIds)) {
      chatIds = [chatIds];
    }
    socket.emit('join_chats', chatIds);
  },

  sendMessage: (data) => {
    if (!data.chatId || !data.content) {
      console.error('Invalid message data:', data);
      return;
    }
    socket.emit('send_message', {
      ...data,
      timestamp: Date.now()
    });
  },

  startTyping: (chatId) => {
    if (!chatId) {
      console.error('ChatId is required for typing events');
      return;
    }
    socket.emit('typing_start', chatId);
  },

  stopTyping: (chatId) => {
    if (!chatId) {
      console.error('ChatId is required for typing events');
      return;
    }
    socket.emit('typing_end', chatId);
  },

  markRead: (chatId, messageIds) => {
    if (!chatId || !Array.isArray(messageIds)) {
      console.error('Invalid mark read data:', { chatId, messageIds });
      return;
    }
    socket.emit('mark_read', { chatId, messageIds });
  },

  // Connection management
  connect: () => {
    if (!socket.connected) {
      socket.connect();
    }
  },

  disconnect: () => {
    if (socket.connected) {
      socket.disconnect();
    }
  },

  // Status check
  isConnected: () => {
    return socket.connected;
  }
};

// Initialize socket connection when token is available
const token = getToken();
if (token) {
  socket.connect();
}

export default {
  socket,
  socketEvents,
  initializeSocketListeners
};