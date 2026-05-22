const User = require('../../models/User');

const onlineUsers = new Map();

const addOnlineUser = async (userId, socketId) => {
  const activeSockets = onlineUsers.get(userId) || new Set();
  activeSockets.add(socketId);
  onlineUsers.set(userId, activeSockets);

  if (activeSockets.size === 1) {
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: null
    });
  }
};

const removeOnlineUser = async (userId, socketId) => {
  const activeSockets = onlineUsers.get(userId);

  if (!activeSockets) {
    return;
  }

  activeSockets.delete(socketId);

  if (activeSockets.size > 0) {
    onlineUsers.set(userId, activeSockets);
    return;
  }

  onlineUsers.delete(userId);

  await User.findByIdAndUpdate(userId, {
    isOnline: false,
    lastSeen: new Date()
  });
};

const handleConnection = async (socket) => {
  const userId = socket.user._id.toString();

  try {
    socket.join(userId);
    await addOnlineUser(userId, socket.id);
    console.log(`Socket connected: ${socket.id} (user: ${userId})`);
  } catch (error) {
    console.error(`Failed to handle socket connection for ${socket.id}:`, error.message);
    socket.disconnect(true);
    return;
  }

  socket.on('disconnect', async (reason) => {
    try {
      await removeOnlineUser(userId, socket.id);
      console.log(`Socket disconnected: ${socket.id} (user: ${userId}, reason: ${reason})`);
    } catch (error) {
      console.error(`Failed to handle socket disconnect for ${socket.id}:`, error.message);
    }
  });
};

const getOnlineUsers = () => onlineUsers;

module.exports = {
  handleConnection,
  getOnlineUsers
};
