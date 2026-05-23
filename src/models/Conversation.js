const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
    participantKey: {
      type: String,
      trim: true
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    }
  },
  {
    timestamps: true
  }
);

conversationSchema.path('participants').validate(function validateParticipants(participants) {
  return participants.length === 2;
}, 'One-to-one conversations must have exactly 2 participants');

conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index({ participantKey: 1 }, { unique: true, sparse: true });
conversationSchema.index({ updatedAt: -1 });

conversationSchema.statics.createParticipantKey = function createParticipantKey(participants) {
  return participants
    .map((participantId) => participantId.toString())
    .sort()
    .join(':');
};

conversationSchema.methods.hasParticipant = function hasParticipant(userId) {
  return this.participants.some((participantId) => participantId.toString() === userId.toString());
};

conversationSchema.statics.findForUser = function findForUser(userId) {
  return this.find({ participants: userId }).sort({ updatedAt: -1 });
};

module.exports = mongoose.model('Conversation', conversationSchema);
