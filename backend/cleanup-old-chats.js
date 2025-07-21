require('dotenv').config();
const mongoose = require('mongoose');
const Chatrooms = require('./models/ChatroomsModel');
const Messages = require('./models/MessagesModel');

async function cleanupOldChats() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');
        
        // หาแชทที่ใช้ user_id structure เก่า
        console.log('🔍 Finding old chat structure...');
        const oldChats = await Chatrooms.find({
            user_id: { $exists: true, $ne: [] }
        });
        
        console.log(`📋 Found ${oldChats.length} old chats to clean up`);
        
        if (oldChats.length > 0) {
            // แสดงข้อมูลแชทที่จะลบ
            console.log('📋 Chats to be deleted:');
            oldChats.forEach((chat, index) => {
                console.log(`${index + 1}. ${chat.roomName} (${chat._id})`);
            });
            
            // ลบข้อความที่เกี่ยวข้อง
            console.log('🗑️ Deleting related messages...');
            for (const chat of oldChats) {
                const messagesResult = await Messages.deleteMany({ chat_id: chat._id });
                console.log(`🗑️ Deleted ${messagesResult.deletedCount} messages for chat ${chat._id}`);
            }
            
            // ลบแชท
            console.log('🗑️ Deleting old chats...');
            const deleteResult = await Chatrooms.deleteMany({
                user_id: { $exists: true, $ne: [] }
            });
            console.log(`🗑️ Deleted ${deleteResult.deletedCount} old chats`);
        }
        
        // แสดงแชทที่เหลือ
        const remainingChats = await Chatrooms.find({}).populate('participants', 'firstName lastName');
        console.log(`✅ Remaining chats: ${remainingChats.length}`);
        
        if (remainingChats.length > 0) {
            console.log('📋 Current chats:');
            remainingChats.forEach((chat, index) => {
                const participantNames = chat.participants?.map(p => `${p.firstName} ${p.lastName}`).join(', ') || 'No participants';
                console.log(`${index + 1}. ${chat.roomName} - Participants: ${participantNames}`);
            });
        }
        
        console.log('✅ Cleanup completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

cleanupOldChats();
