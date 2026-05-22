const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
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

conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index({ updatedAt: -1 });

conversationSchema.methods.hasParticipant = function hasParticipant(userId) {
  return this.participants.some((participantId) => participantId.toString() === userId.toString());
};

conversationSchema.statics.findForUser = function findForUser(userId) {
  return this.find({ participants: userId }).sort({ updatedAt: -1 });
};

module.exports = mongoose.model('Conversation', conversationSchema);
