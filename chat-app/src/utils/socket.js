import io from 'socket.io-client';
import { getToken } from './auth';

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: {
    token: getToken()
  }
});

// Socket event listeners
export const initializeSocketListeners = (dispatch) => {
  // Connection events
  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  // Message events
  socket.on('new_message', ({ message, timestamp }) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  });

  socket.on('messages_read', ({ chatId, userId, messageIds }) => {
    dispatch({
      type: 'UPDATE_READ_STATUS',
      payload: { chatId, userId, messageIds }
    });
  });

  // Typing events
  socket.on('typing_update', ({ chatId, users }) => {
    dispatch({
      type: 'UPDATE_TYPING_STATUS',
      payload: { chatId, users }
    });
  });

  // User status events
  socket.on('user_status', ({ userId, status, timestamp }) => {
    dispatch({
      type: 'UPDATE_USER_STATUS',
      payload: { userId, status, timestamp }
    });
  });

  // Error events
  socket.on('error', ({ message, error }) => {
    console.error('Socket error:', message, error);
  });
};

// Socket event emitters
export const socketEvents = {
  joinChats: (chatIds) => {
    socket.emit('join_chats', chatIds);
  },

  sendMessage: (data) => {
    socket.emit('send_message', data);
  },

  startTyping: (chatId) => {
    socket.emit('typing_start', chatId);
  },

  stopTyping: (chatId) => {
    socket.emit('typing_end', chatId);
  },

  markRead: (chatId, messageIds) => {
    socket.emit('mark_read', { chatId, messageIds });
  }
};