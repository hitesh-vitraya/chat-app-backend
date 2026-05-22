const User = require('../../models/User');
const { registerMessageHandlers } = require('./messageHandler');
const { registerSeenHandlers } = require('./seenHandler');
const { registerTypingHandlers } = require('./typingHandler');

const onlineUsers = new Map();

const createPresencePayload = (userId, isOnline, lastSeen = null) => ({
  userId,
  isOnline,
  lastSeen: lastSeen ? lastSeen.toISOString() : null
});

const addOnlineUser = async (userId, socketId) => {
  const activeSockets = onlineUsers.get(userId) || new Set();
  const wasOffline = activeSockets.size === 0;

  activeSockets.add(socketId);
  onlineUsers.set(userId, activeSockets);

  if (wasOffline) {
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: null
    });
  }

  return wasOffline;
};

const removeOnlineUser = async (userId, socketId) => {
  const activeSockets = onlineUsers.get(userId);

  if (!activeSockets) {
    return null;
  }

  activeSockets.delete(socketId);

  if (activeSockets.size > 0) {
    onlineUsers.set(userId, activeSockets);
    return null;
  }

  onlineUsers.delete(userId);

  const lastSeen = new Date();

  await User.findByIdAndUpdate(userId, {
    isOnline: false,
    lastSeen
  });

  return lastSeen;
};

const handleConnection = async (socket) => {
  const userId = socket.user._id.toString();

  socket.on('disconnect', async (reason) => {
    try {
      const lastSeen = await removeOnlineUser(userId, socket.id);

      if (lastSeen) {
        socket.broadcast.emit('user_offline', createPresencePayload(userId, false, lastSeen));
      }

      console.log(`Socket disconnected: ${socket.id} (user: ${userId}, reason: ${reason})`);
    } catch (error) {
      console.error(`Failed to handle socket disconnect for ${socket.id}:`, error.message);
    }
  });

  try {
    socket.join(userId);
    const becameOnline = await addOnlineUser(userId, socket.id);

    if (becameOnline) {
      socket.broadcast.emit('user_online', createPresencePayload(userId, true));
    }

    registerMessageHandlers(socket);
    registerSeenHandlers(socket);
    registerTypingHandlers(socket);
    console.log(`Socket connected: ${socket.id} (user: ${userId})`);
  } catch (error) {
    console.error(`Failed to handle socket connection for ${socket.id}:`, error.message);
    socket.disconnect(true);
    return;
  }
};

const getOnlineUsers = () => onlineUsers;

module.exports = {
  handleConnection,
  getOnlineUsers
};
