/**
 * Message Model — Employee/Vendor Chat
 */
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  storeId:    { type: String, required: true, default: 'store-001' },
  roomId:     { type: String, required: true }, // e.g. "direct-user1-user2" or "group-staff"
  roomType:   { type: String, enum: ['direct', 'group', 'vendor', 'broadcast'], default: 'direct' },
  roomName:   { type: String }, // For groups

  sender:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String },
  senderAvatar: { type: String },

  content:    { type: String, required: true, maxlength: 2000 },
  type:       { type: String, enum: ['text', 'image', 'file', 'system', 'po_share'], default: 'text' },

  // Attachments
  attachment: {
    url:  String,
    name: String,
    size: Number,
    mime: String,
  },

  // Reactions (emoji)
  reactions: [{
    emoji:  String,
    users:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    count:  Number,
  }],

  // Read receipts
  readBy: [{
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: Date
  }],

  edited:    { type: Boolean, default: false },
  editedAt:  { type: Date },
  deletedAt: { type: Date },
  replyTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },

}, { timestamps: true });

messageSchema.index({ storeId: 1, roomId: 1, createdAt: -1 });

// Chat Room model
const chatRoomSchema = new mongoose.Schema({
  storeId:   { type: String, required: true, default: 'store-001' },
  type:      { type: String, enum: ['direct', 'group', 'vendor', 'broadcast'], default: 'direct' },
  name:      { type: String },
  icon:      { type: String, default: '💬' },
  members:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  memberNames: [String],
  lastMessage: { type: String },
  lastMessageAt: { type: Date },
  unread:    { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

chatRoomSchema.index({ storeId: 1, members: 1 });

module.exports = {
  Message:  mongoose.model('Message', messageSchema),
  ChatRoom: mongoose.model('ChatRoom', chatRoomSchema),
};
