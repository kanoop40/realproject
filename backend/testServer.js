const express = require('express');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();

// เชื่อมต่อฐานข้อมูล
connectDB();

app.use(express.json());

// Test endpoint สำหรับดู read status
app.get('/test-read-status/:chatroomId', async (req, res) => {
    try {
        const Messages = require('./models/MessagesModel');
        const { chatroomId } = req.params;
        
        console.log('🔍 Testing read status for chatroom:', chatroomId);
        
        const messages = await Messages.find({ chat_id: chatroomId })
            .populate('user_id', 'firstName lastName')
            .sort({ time: 1 })
            .limit(10);
            
        const result = messages.map(msg => ({
            id: msg._id.toString().slice(-4),
            content: msg.content.substring(0, 30) + '...',
            sender: msg.user_id.firstName + ' ' + msg.user_id.lastName,
            senderId: msg.user_id._id.toString(),
            readBy: msg.readBy || [],
            readByCount: (msg.readBy || []).length,
            time: msg.time
        }));
        
        res.json({
            chatroom: chatroomId,
            messageCount: messages.length,
            messages: result
        });
        
    } catch (error) {
        console.error('❌ Error testing read status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint สำหรับ mark as read
app.post('/test-mark-read/:chatroomId/:userId', async (req, res) => {
    try {
        const Messages = require('./models/MessagesModel');
        const { chatroomId, userId } = req.params;
        
        console.log('📖 Marking messages as read:', { chatroomId, userId });
        
        const updateResult = await Messages.updateMany(
            { 
                chat_id: chatroomId,
                user_id: { $ne: userId },
                'readBy.user': { $ne: userId }
            },
            { 
                $push: { 
                    readBy: { 
                        user: userId, 
                        readAt: new Date() 
                    } 
                }
            }
        );
        
        res.json({
            updated: updateResult.modifiedCount,
            matched: updateResult.matchedCount
        });
        
    } catch (error) {
        console.error('❌ Error marking as read:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🧪 Test server running on port ${PORT}`);
    console.log(`📍 Test endpoints:`);
    console.log(`   GET  /test-read-status/:chatroomId`);
    console.log(`   POST /test-mark-read/:chatroomId/:userId`);
});
