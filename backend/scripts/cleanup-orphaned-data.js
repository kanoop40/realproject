#!/usr/bin/env node

/**
 * Cleanup Orphaned Data Script
 * 
 * สคริปต์นี้ใช้สำหรับทำความสะอาดข้อมูลที่เหลือค้างในระบบ
 * เช่น ข้อความที่ไม่มี user_id หรือกลุ่มที่ไม่มีสมาชิก
 * 
 * วิธีใช้:
 * node scripts/cleanup-orphaned-data.js
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

const cleanupOrphanedData = async () => {
    console.log('🧹 Starting automated cleanup for orphaned data...');
    console.log('📅 Cleanup time:', new Date().toISOString());
    
    try {
        let cleanupResults = {
            orphanedMessages: 0,
            orphanedFiles: 0,
            orphanedNotifications: 0,
            emptyGroups: 0,
            emptyChatrooms: 0,
            invalidGroupMembers: 0
        };

        // Get all valid user IDs
        const allUserIds = await User.find({}, { _id: 1 });
        const validUserIds = allUserIds.map(user => user._id);
        console.log(`👥 Found ${validUserIds.length} valid users in system`);

        // 1. Clean orphaned messages
        console.log('🧹 Cleaning orphaned messages...');
        const orphanedMessages = await Messages.deleteMany({
            user_id: { $nin: validUserIds }
        });
        cleanupResults.orphanedMessages = orphanedMessages.deletedCount;
        console.log(`✅ Cleaned ${orphanedMessages.deletedCount} orphaned messages`);

        // 2. Clean orphaned files
        console.log('🧹 Cleaning orphaned files...');
        const orphanedFiles = await File.deleteMany({
            uploadedBy: { $nin: validUserIds }
        });
        cleanupResults.orphanedFiles = orphanedFiles.deletedCount;
        console.log(`✅ Cleaned ${orphanedFiles.deletedCount} orphaned files`);

        // 3. Clean orphaned notifications
        console.log('🧹 Cleaning orphaned notifications...');
        const orphanedNotifications = await Notification.deleteMany({
            $or: [
                { userId: { $nin: validUserIds } },
                { fromUserId: { $nin: validUserIds } }
            ]
        });
        cleanupResults.orphanedNotifications = orphanedNotifications.deletedCount;
        console.log(`✅ Cleaned ${orphanedNotifications.deletedCount} orphaned notifications`);

        // 4. Clean invalid group members
        console.log('🧹 Cleaning invalid group members...');
        const groupsWithInvalidMembers = await GroupChat.updateMany(
            {},
            { $pull: { members: { user: { $nin: validUserIds } } } }
        );
        cleanupResults.invalidGroupMembers = groupsWithInvalidMembers.modifiedCount;
        console.log(`✅ Cleaned invalid members from ${groupsWithInvalidMembers.modifiedCount} groups`);

        // 5. Clean empty groups
        console.log('🧹 Cleaning empty groups...');
        const emptyGroups = await GroupChat.deleteMany({
            $or: [
                { members: { $size: 0 } },
                { members: { $exists: false } },
                { creator: { $nin: validUserIds } }
            ]
        });
        cleanupResults.emptyGroups = emptyGroups.deletedCount;
        console.log(`✅ Cleaned ${emptyGroups.deletedCount} empty groups`);

        // 6. Clean empty chatrooms
        console.log('🧹 Cleaning empty chatrooms...');
        const emptyChatrooms = await Chatrooms.deleteMany({
            $and: [
                { $or: [{ participants: { $size: 0 } }, { participants: { $exists: false } }] },
                { $or: [{ user_id: { $size: 0 } }, { user_id: { $exists: false } }] }
            ]
        });
        cleanupResults.emptyChatrooms = emptyChatrooms.deletedCount;
        console.log(`✅ Cleaned ${emptyChatrooms.deletedCount} empty chatrooms`);

        // Show summary
        console.log('\n📊 Cleanup Summary:');
        console.log('==================');
        console.log(`🗑️  Orphaned Messages: ${cleanupResults.orphanedMessages}`);
        console.log(`📎 Orphaned Files: ${cleanupResults.orphanedFiles}`);
        console.log(`🔔 Orphaned Notifications: ${cleanupResults.orphanedNotifications}`);
        console.log(`👥 Invalid Group Members: ${cleanupResults.invalidGroupMembers}`);
        console.log(`🏷️  Empty Groups: ${cleanupResults.emptyGroups}`);
        console.log(`💬 Empty Chatrooms: ${cleanupResults.emptyChatrooms}`);
        console.log('==================');

        const totalCleaned = Object.values(cleanupResults).reduce((sum, count) => sum + count, 0);
        console.log(`✨ Total items cleaned: ${totalCleaned}`);
        console.log('🎉 Automated cleanup completed successfully');
        console.log('📅 Cleanup finished:', new Date().toISOString());

        return cleanupResults;

    } catch (error) {
        console.error('❌ Error during automated cleanup:', error);
        throw error;
    }
};

// Main function
const main = async () => {
    try {
        await connectDB();
        await cleanupOrphanedData();
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

module.exports = { cleanupOrphanedData };
