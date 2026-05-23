const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { sendOnlineAlert, sendNewMessageNotification } = require('../utils/mailer');

const setupChatSocket = (io) => {
  // Authenticate socket connections via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: No token'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    // Toggle user online status in database & notify clients
    try {
      await User.findByIdAndUpdate(socket.userId, { isOnline: true });
      io.emit('userStatus', { userId: socket.userId, isOnline: true });

      // Notify active partners that this user is now online
      const userWhoCameOnline = await User.findById(socket.userId);
      if (userWhoCameOnline) {
        const conversations = await Conversation.find({ participants: socket.userId });
        for (const conv of conversations) {
          const otherParticipantId = conv.participants.find(p => p.toString() !== socket.userId.toString());
          if (otherParticipantId) {
            const recipient = await User.findById(otherParticipantId);
            if (recipient) {
              let role = 'Partner';
              if (conv.noteId) {
                const Note = require('../models/Note');
                const note = await Note.findById(conv.noteId);
                if (note) {
                  role = note.sellerId.toString() === socket.userId.toString() ? 'Seller' : 'Buyer';
                }
              }
              // Dispatch online alert
              sendOnlineAlert(recipient, userWhoCameOnline, role).catch(err =>
                console.error('Error sending online alert:', err)
              );
            }
          }
        }
      }
    } catch (err) {
      console.error('Socket connection status update error:', err);
    }

    // Join personal room for targeted notifications
    socket.join(`user_${socket.userId}`);

    // Join a conversation room
    socket.on('joinRoom', async (conversationId) => {
      socket.join(conversationId);
      console.log(`User ${socket.userId} joined room ${conversationId}`);
      
      // Real-time: mark messages in this conversation as read
      try {
        await Message.updateMany(
          { conversationId, senderId: { $ne: socket.userId }, read: false },
          { $set: { read: true } }
        );
        // Notify other client that messages have been read
        socket.to(conversationId).emit('messagesRead', { conversationId, readerId: socket.userId });
      } catch (err) {
        console.error('Error marking messages as read on joinRoom:', err);
      }
    });

    // Leave a conversation room
    socket.on('leaveRoom', (conversationId) => {
      socket.leave(conversationId);
    });

    // Send a message via socket
    socket.on('sendMessage', async ({ conversationId, text }) => {
      try {
        if (!text || !text.trim() || !conversationId) return;

        // Verify user is part of the conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.includes(socket.userId)) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // Save message to DB
        const message = await Message.create({
          conversationId,
          senderId: socket.userId,
          text: text.trim(),
          read: false,
        });

        // Update conversation timestamp & lastMessage
        conversation.lastMessage = text.trim();
        await conversation.save();

        const populated = await message.populate('senderId', 'fullName username avatar');

        // Broadcast to all users in the room (including sender)
        io.to(conversationId).emit('newMessage', {
          _id: populated._id,
          conversationId: populated.conversationId,
          senderId: populated.senderId,
          text: populated.text,
          read: populated.read,
          createdAt: populated.createdAt,
        });

        // Trigger notification email if the recipient is offline
        const otherParticipantId = conversation.participants.find(p => p.toString() !== socket.userId.toString());
        if (otherParticipantId) {
          const recipient = await User.findById(otherParticipantId);
          const sender = await User.findById(socket.userId);
          if (recipient && !recipient.isOnline) {
            sendNewMessageNotification(recipient, sender, text.trim()).catch(err =>
              console.error('Error sending offline message alert:', err)
            );
          }
        }
      } catch (err) {
        console.error('Socket sendMessage error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator — include conversationId so the frontend can filter
    // by active conversation (prevents showing indicator in the wrong chat)
    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(conversationId).emit('userTyping', {
        conversationId,
        userId: socket.userId,
        isTyping,
      });
    });

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      try {
        await User.findByIdAndUpdate(socket.userId, { isOnline: false });
        io.emit('userStatus', { userId: socket.userId, isOnline: false });
      } catch (err) {
        console.error('Socket disconnect status update error:', err);
      }
    });
  });
};

module.exports = setupChatSocket;
