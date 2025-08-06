const mongoose = require('mongoose');
require('dotenv').config();
const Messages = require('./models/MessagesModel');
const User = require('./models/UserModel');

// เชื่อมต่อฐานข้อมูล
console.log('🔗 Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function testReadStatus() {
    try {
        console.log('🔍 Testing read status system...');
        
        // หาผู้ใช้ทดสอบ
        const users = await User.find().limit(2);
        if (users.length < 2) {
            console.log('❌ Need at least 2 users to test');
            return;
        }
        
        const user1 = users[0];
        const user2 = users[1];
        
        console.log('👥 Test users:');
        console.log(`User 1: ${user1.firstName} ${user1.lastName} (${user1._id})`);
        console.log(`User 2: ${user2.firstName} ${user2.lastName} (${user2._id})`);
        
        // หาข้อความล่าสุดของ user1
        const user1Messages = await Messages.find({ user_id: user1._id })
            .sort({ time: -1 })
            .limit(5)
            .populate('user_id', 'firstName lastName');
            
        console.log(`\n📨 Latest messages from ${user1.firstName}:`);
        user1Messages.forEach(msg => {
            const readByOthers = msg.readBy?.filter(read => 
                read.user.toString() !== user1._id.toString()
            );
            
            console.log(`Message: "${msg.content.substring(0, 30)}..."`);
            console.log(`  ID: ${msg._id}`);
            console.log(`  ReadBy: ${msg.readBy?.length || 0} users`);
            console.log(`  ReadBy others: ${readByOthers?.length || 0} users`);
            console.log(`  Should show as read: ${(readByOthers?.length || 0) > 0}`);
            console.log('---');
        });
        
        // ทดสอบการมาร์คข้อความเป็นอ่านแล้ว
        if (user1Messages.length > 0) {
            const testMessage = user1Messages[0];
            console.log(`\n🧪 Testing: Marking message "${testMessage.content.substring(0, 30)}..." as read by ${user2.firstName}`);
            
            // เช็คว่า user2 อ่านข้อความนี้แล้วหรือยัง
            const alreadyRead = testMessage.readBy?.some(read => 
                read.user.toString() === user2._id.toString()
            );
            
            if (!alreadyRead) {
                await Messages.updateOne(
                    { _id: testMessage._id },
                    { 
                        $push: { 
                            readBy: { 
                                user: user2._id, 
                                readAt: new Date() 
                            } 
                        }
                    }
                );
                console.log('✅ Message marked as read');
            } else {
                console.log('ℹ️ Message already marked as read');
            }
            
            // ตรวจสอบสถานะหลังการอัปเดต
            const updatedMessage = await Messages.findById(testMessage._id);
            const readByOthers = updatedMessage.readBy?.filter(read => 
                read.user.toString() !== user1._id.toString()
            );
            
            console.log('📊 Updated status:');
            console.log(`  ReadBy total: ${updatedMessage.readBy?.length || 0}`);
            console.log(`  ReadBy others: ${readByOthers?.length || 0}`);
            console.log(`  Should show "อ่านแล้ว": ${(readByOthers?.length || 0) > 0}`);
        }
        
    } catch (error) {
        console.error('❌ Error testing read status:', error);
    } finally {
        mongoose.connection.close();
    }
}

testReadStatus();
