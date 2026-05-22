const mongoose = require('mongoose');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');

const sendAck = (callback, payload) => {
  if (typeof callback === 'function') {
    callback(payload);
  }
};

const validateSeenPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return 'Seen payload is required';
  }

  if (!payload.conversationId) {
    return 'Conversation id is required';
  }

  if (!mongoose.Types.ObjectId.isValid(payload.conversationId)) {
    return 'Conversation id is invalid';
  }

  return null;
};

const registerSeenHandlers = (socket) => {
  socket.on('message_seen', async (payload, callback) => {
    try {
      const validationError = validateSeenPayload(payload);

      if (validationError) {
        return sendAck(callback, {
          success: false,
          message: validationError
        });
      }

      const userId = socket.user._id;
      const conversationId = payload.conversationId.toString();
      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        return sendAck(callback, {
          success: false,
          message: 'Conversation not found'
        });
      }

      if (!conversation.hasParticipant(userId)) {
        return sendAck(callback, {
          success: false,
          message: 'You are not allowed to access this conversation'
        });
      }

      const unreadMessages = await Message.find({
        conversationId,
        receiver: userId,
        status: 'sent'
      }).select('_id sender');

      if (unreadMessages.length === 0) {
        return sendAck(callback, {
          success: true,
          data: {
            conversationId,
            seenCount: 0,
            messageIds: []
          }
        });
      }

      const messageIds = unreadMessages.map((message) => message._id);
      const senderIds = [...new Set(unreadMessages.map((message) => message.sender.toString()))];

      await Message.updateMany(
        { _id: { $in: messageIds } },
        { $set: { status: 'seen' } }
      );

      const seenPayload = {
        conversationId,
        seenBy: userId.toString(),
        messageIds: messageIds.map((messageId) => messageId.toString()),
        seenCount: messageIds.length
      };

      senderIds.forEach((senderId) => {
        socket.to(senderId).emit('messages_seen', seenPayload);
      });

      return sendAck(callback, {
        success: true,
        data: seenPayload
      });
    } catch (error) {
      console.error(`Failed to mark messages as seen from socket ${socket.id}:`, error.message);

      return sendAck(callback, {
        success: false,
        message: 'Failed to mark messages as seen'
      });
    }
  });
};

module.exports = {
  registerSeenHandlers
};
