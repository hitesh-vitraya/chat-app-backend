const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { findOrCreateOneToOneConversation, populateConversation } = require('../services/conversationService');
const AppError = require('../utils/AppError');

const parsePagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
};

const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [conversations, unreadCounts] = await Promise.all([
      Conversation.findForUser(userId)
        .populate('participants', 'name email isOnline lastSeen')
        .populate({
          path: 'lastMessage',
          populate: [
            { path: 'sender', select: 'name email isOnline lastSeen' },
            { path: 'receiver', select: 'name email isOnline lastSeen' }
          ]
        }),
      Message.aggregate([
        {
          $match: {
            receiver: userId,
            status: 'sent'
          }
        },
        {
          $group: {
            _id: '$conversationId',
            unreadCount: { $sum: 1 }
          }
        }
      ])
    ]);

    const unreadCountMap = unreadCounts.reduce((counts, item) => {
      counts.set(item._id.toString(), item.unreadCount);
      return counts;
    }, new Map());

    const formattedConversations = conversations.map((conversation) => ({
      ...conversation.toJSON(),
      unreadCount: unreadCountMap.get(conversation._id.toString()) || 0
    }));

    res.status(200).json({
      success: true,
      message: 'Conversations fetched successfully',
      data: {
        conversations: formattedConversations
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new AppError('Invalid conversation id', 400);
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (!conversation.hasParticipant(req.user._id)) {
      throw new AppError('You are not allowed to access this conversation', 403);
    }

    const { page, limit, skip } = parsePagination(req.query);

    const [messages, totalMessages] = await Promise.all([
      Message.find({ conversationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'name email isOnline lastSeen')
        .populate('receiver', 'name email isOnline lastSeen'),
      Message.countDocuments({ conversationId })
    ]);

    const totalPages = Math.ceil(totalMessages / limit);

    res.status(200).json({
      success: true,
      message: 'Messages fetched successfully',
      data: {
        messages: messages.reverse(),
        pagination: {
          page,
          limit,
          totalMessages,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const startConversation = async (req, res, next) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    if (!receiverId) {
      throw new AppError('Receiver id is required', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      throw new AppError('Receiver id is invalid', 400);
    }

    if (receiverId.toString() === senderId.toString()) {
      throw new AppError('Cannot start conversation with yourself', 400);
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      throw new AppError('Receiver not found', 404);
    }

    const conversation = await findOrCreateOneToOneConversation(senderId, receiverId);
    const populatedConversation = await populateConversation(
      Conversation.findById(conversation._id)
    );

    res.status(200).json({
      success: true,
      message: 'Conversation fetched successfully',
      data: {
        conversation: populatedConversation
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConversations,
  getMessages,
  startConversation
};
