const Conversation = require('../models/Conversation');

const populateConversation = (query) => query
  .populate('participants', 'name email isOnline lastSeen')
  .populate({
    path: 'lastMessage',
    populate: [
      { path: 'sender', select: 'name email isOnline lastSeen' },
      { path: 'receiver', select: 'name email isOnline lastSeen' }
    ]
  });

const findOneToOneConversation = async (senderId, receiverId) => {
  const participants = [senderId, receiverId];
  const participantKey = Conversation.createParticipantKey(participants);

  return Conversation.findOne({
    $or: [
      { participantKey },
      {
        participants: {
          $all: participants,
          $size: 2
        }
      }
    ]
  });
};

const findOrCreateOneToOneConversation = async (senderId, receiverId) => {
  const participants = [senderId, receiverId];
  const participantKey = Conversation.createParticipantKey(participants);

  const existingConversation = await findOneToOneConversation(senderId, receiverId);
  if (existingConversation) {
    if (!existingConversation.participantKey) {
      existingConversation.participantKey = participantKey;

      try {
        await existingConversation.save();
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }

        return Conversation.findOne({ participantKey });
      }
    }

    return existingConversation;
  }

  try {
    return await Conversation.create({
      participants,
      participantKey
    });
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    return Conversation.findOne({ participantKey });
  }
};

module.exports = {
  findOrCreateOneToOneConversation,
  populateConversation
};
