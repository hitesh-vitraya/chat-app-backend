const mongoose = require('mongoose');

const TYPING_START_THROTTLE_MS = 1000;
const TYPING_AUTO_STOP_MS = 3000;

const typingStates = new Map();

const sendAck = (callback, payload) => {
  if (typeof callback === 'function') {
    callback(payload);
  }
};

const getTypingKey = (socketId, receiverId) => `${socketId}:${receiverId}`;

const validateTypingPayload = (payload, senderId) => {
  if (!payload || typeof payload !== 'object') {
    return 'Typing payload is required';
  }

  const { receiverId } = payload;

  if (!receiverId) {
    return 'Receiver id is required';
  }

  if (!mongoose.Types.ObjectId.isValid(receiverId)) {
    return 'Receiver id is invalid';
  }

  if (receiverId.toString() === senderId.toString()) {
    return 'Cannot send typing event to yourself';
  }

  return null;
};

const emitTypingStop = (socket, receiverId, senderId) => {
  socket.to(receiverId).emit('user_stop_typing', {
    userId: senderId,
    receiverId
  });
};

const clearTypingState = (key) => {
  const state = typingStates.get(key);

  if (state?.timeoutId) {
    clearTimeout(state.timeoutId);
  }

  typingStates.delete(key);
  return state;
};

const scheduleAutoStop = (socket, key, receiverId, senderId, lastStartAt) => {
  const timeoutId = setTimeout(() => {
    const currentState = typingStates.get(key);

    if (!currentState || currentState.lastStartAt !== lastStartAt) {
      return;
    }

    typingStates.delete(key);
    emitTypingStop(socket, receiverId, senderId);
  }, TYPING_AUTO_STOP_MS);

  return timeoutId;
};

const handleTypingStart = (socket, payload, callback) => {
  const senderId = socket.user._id.toString();
  const validationError = validateTypingPayload(payload, senderId);

  if (validationError) {
    return sendAck(callback, {
      success: false,
      message: validationError
    });
  }

  const receiverId = payload.receiverId.toString();
  const key = getTypingKey(socket.id, receiverId);
  const now = Date.now();
  const currentState = typingStates.get(key);
  const shouldEmit = !currentState || now - currentState.lastEmittedAt >= TYPING_START_THROTTLE_MS;

  if (currentState?.timeoutId) {
    clearTimeout(currentState.timeoutId);
  }

  const lastEmittedAt = shouldEmit ? now : currentState.lastEmittedAt;
  const timeoutId = scheduleAutoStop(socket, key, receiverId, senderId, now);

  typingStates.set(key, {
    socketId: socket.id,
    receiverId,
    senderId,
    lastStartAt: now,
    lastEmittedAt,
    timeoutId
  });

  if (shouldEmit) {
    socket.to(receiverId).emit('user_typing', {
      userId: senderId,
      receiverId,
      message: 'User is typing...'
    });
  }

  return sendAck(callback, {
    success: true
  });
};

const handleTypingStop = (socket, payload, callback) => {
  const senderId = socket.user._id.toString();
  const validationError = validateTypingPayload(payload, senderId);

  if (validationError) {
    return sendAck(callback, {
      success: false,
      message: validationError
    });
  }

  const receiverId = payload.receiverId.toString();
  const key = getTypingKey(socket.id, receiverId);
  const state = clearTypingState(key);

  if (state) {
    emitTypingStop(socket, receiverId, senderId);
  }

  return sendAck(callback, {
    success: true
  });
};

const cleanupSocketTypingStates = (socket) => {
  const socketId = socket.id;

  typingStates.forEach((state, key) => {
    if (state.socketId !== socketId) {
      return;
    }

    clearTypingState(key);
    emitTypingStop(socket, state.receiverId, state.senderId);
  });
};

const registerTypingHandlers = (socket) => {
  socket.on('typing_start', (payload, callback) => {
    try {
      handleTypingStart(socket, payload, callback);
    } catch (error) {
      console.error(`Failed to handle typing_start from socket ${socket.id}:`, error.message);

      sendAck(callback, {
        success: false,
        message: 'Failed to send typing event'
      });
    }
  });

  socket.on('typing_stop', (payload, callback) => {
    try {
      handleTypingStop(socket, payload, callback);
    } catch (error) {
      console.error(`Failed to handle typing_stop from socket ${socket.id}:`, error.message);

      sendAck(callback, {
        success: false,
        message: 'Failed to stop typing event'
      });
    }
  });

  socket.on('disconnect', () => {
    cleanupSocketTypingStates(socket);
  });
};

module.exports = {
  registerTypingHandlers
};
