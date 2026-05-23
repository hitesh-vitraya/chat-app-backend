const mongoose = require('mongoose');
const Message = require('../../models/Message');
const User = require('../../models/User');
const Conversation = require('../../models/Conversation');
const { findOrCreateOneToOneConversation } = require('../../services/conversationService');

const sendAck = (callback, payload) => {
  if (typeof callback === 'function') {
    callback(payload);
  }
};

const validateMessagePayload = (payload, senderId) => {
  if (!payload || typeof payload !== 'object') {
    return 'Message payload is required';
  }

  const { receiverId, text } = payload;

  if (!receiverId) {
    return 'Receiver id is required';
  }

  if (!mongoose.Types.ObjectId.isValid(receiverId)) {
    return 'Receiver id is invalid';
  }

  if (receiverId.toString() === senderId.toString()) {
    return 'Cannot send message to yourself';
  }

  if (typeof text !== 'string' || !text.trim()) {
    return 'Message text is required';
  }

  return null;
};

const registerMessageHandlers = (socket) => {
  socket.on('send_message', async (payload, callback) => {
    try {
      const senderId = socket.user._id.toString();
      const validationError = validateMessagePayload(payload, senderId);

      if (validationError) {
        return sendAck(callback, {
          success: false,
          message: validationError
        });
      }

      const receiverId = payload.receiverId.toString();
      const receiver = await User.findById(receiverId);

      if (!receiver) {
        return sendAck(callback, {
          success: false,
          message: 'Receiver not found'
        });
      }

      const conversation = await findOrCreateOneToOneConversation(senderId, receiverId);
      const message = await Message.create({
        conversationId: conversation._id,
        sender: senderId,
        receiver: receiverId,
        text: payload.text.trim()
      });

      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: message._id
      });

      const savedMessage = message.toJSON();

      socket.to(receiverId).emit('receive_message', savedMessage);

      return sendAck(callback, {
        success: true,
        data: {
          message: savedMessage
        }
      });
    } catch (error) {
      console.error(`Failed to send message from socket ${socket.id}:`, error.message);

      return sendAck(callback, {
        success: false,
        message: 'Failed to send message'
      });
    }
  });
};

module.exports = {
  registerMessageHandlers
};
