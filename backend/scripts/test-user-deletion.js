#!/usr/bin/env node

/**
 * Test User Deletion Script
 * 
 * สคริปต์นี้ใช้สำหรับทดสอบการลบ user และข้อมูลที่เกี่ยวข้อง
 * 
 * วิธีใช้:
 * node scripts/test-user-deletion.js <user-email>
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import models
const User = require('../models/UserModel');
const Messages = require('../models/MessagesModel');
const GroupChat = require('../models/GroupChatModel');
const Chatrooms = require('../models/ChatroomsModel');
const File = require('../models/FileModel');
const Notification = require('../models/NotificationModel');

// Connect to database
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`🔗 MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
};

const getUserStats = async (userId) => {
    console.log(`📊 Getting statistics for user: ${userId}`);
    
    const stats = {
        messages: await Messages.countDocuments({ user_id: userId }),
        groupsCreated: await GroupChat.countDocuments({ creator: userId }),
        groupMemberships: await GroupChat.countDocuments({ 'members.user': userId }),
        chatrooms: await Chatrooms.countDocuments({
            $or: [
                { user_id: userId },
                { participants: userId },
                { 'members.userId': userId }
            ]
        }),
        files: await File.countDocuments({ uploadedBy: userId }),
        notifications: await Notification.countDocuments({
            $or: [
                { userId: userId },
                { fromUserId: userId }
            ]
        })
    };

    console.log('📈 User Statistics:');
    console.log('==================');
    console.log(`💬 Messages sent: ${stats.messages}`);
    console.log(`👥 Groups created: ${stats.groupsCreated}`);
    console.log(`🏷️  Group memberships: ${stats.groupMemberships}`);
    console.log(`🏠 Chatrooms: ${stats.chatrooms}`);
    console.log(`📎 Files uploaded: ${stats.files}`);
    console.log(`🔔 Notifications: ${stats.notifications}`);
    console.log('==================');

    return stats;
};

const testUserDeletion = async (userEmail) => {
    try {
        console.log('🧪 Starting user deletion test...');
        console.log(`📧 Looking for user with email: ${userEmail}`);

        // Find user
        const user = await User.findOne({ email: userEmail.toLowerCase() });
        if (!user) {
            console.log('❌ User not found');
            return;
        }

        console.log(`👤 Found user: ${user.firstName} ${user.lastName} (${user._id})`);
        console.log(`🎭 Role: ${user.role}`);

        // Get stats before deletion
        console.log('\n📊 BEFORE DELETION:');
        const statsBefore = await getUserStats(user._id);

        // Simulate deletion (don't actually delete in test mode)
        console.log('\n🔍 SIMULATION MODE - No actual deletion will occur');
        console.log('📝 Would delete the following:');
        console.log(`  - User account: ${user.firstName} ${user.lastName}`);
        console.log(`  - ${statsBefore.messages} messages`);
        console.log(`  - ${statsBefore.groupsCreated} groups (as creator)`);
        console.log(`  - Remove from ${statsBefore.groupMemberships} group memberships`);
        console.log(`  - ${statsBefore.chatrooms} chatroom participations`);
        console.log(`  - ${statsBefore.files} uploaded files`);
        console.log(`  - ${statsBefore.notifications} notifications`);

        // Show detailed group information
        if (statsBefore.groupsCreated > 0) {
            console.log('\n🏷️  Groups that would be deleted:');
            const groups = await GroupChat.find({ creator: user._id }, 'groupName members');
            groups.forEach((group, index) => {
                console.log(`  ${index + 1}. ${group.groupName} (${group.members.length} members)`);
            });
        }

        console.log('\n✅ Test completed successfully');
        console.log('💡 To actually delete this user, use the DELETE /api/users/:id endpoint');

    } catch (error) {
        console.error('❌ Error during test:', error);
        throw error;
    }
};

// Main function
const main = async () => {
    try {
        const userEmail = process.argv[2];
        
        if (!userEmail) {
            console.log('❌ Please provide a user email');
            console.log('Usage: node scripts/test-user-deletion.js <user-email>');
            process.exit(1);
        }

        await connectDB();
        await testUserDeletion(userEmail);
        
        console.log('👋 Closing database connection...');
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }
};

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { testUserDeletion };
