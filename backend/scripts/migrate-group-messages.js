const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Messages = require('../models/MessagesModel');
const File = require('../models/FileModel');

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Migrate old group messages
const migrateGroupMessages = async () => {
  try {
    console.log('🔍 Finding group messages without fileUrl...');
    
    // หา messages ที่เป็น image/file แต่ไม่มี fileUrl
    const messagesNeedingMigration = await Messages.find({
      group_id: { $ne: null }, // เป็น group message
      messageType: { $in: ['image', 'file'] }, // เป็น image หรือ file
      $or: [
        { fileUrl: { $exists: false } },
        { fileUrl: null },
        { fileUrl: '' }
      ]
    }).populate('file_id');
    
    console.log(`📊 Found ${messagesNeedingMigration.length} messages needing migration`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const message of messagesNeedingMigration) {
      try {
        // ถ้ามี file_id ให้ใช้ข้อมูลจาก File collection
        if (message.file_id) {
          const fileDoc = await File.findById(message.file_id);
          if (fileDoc) {
            message.fileUrl = fileDoc.file_path;
            message.fileName = fileDoc.file_name;
            message.fileSize = parseInt(fileDoc.size) || null;
            message.mimeType = fileDoc.file_type;
            
            await message.save();
            migratedCount++;
            console.log(`✅ Migrated message ${message._id} with file ${fileDoc.file_name}`);
          } else {
            console.log(`⚠️ File document not found for message ${message._id}`);
            skippedCount++;
          }
        } else {
          console.log(`⚠️ No file_id for message ${message._id}`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error migrating message ${message._id}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log(`\n📈 Migration Summary:`);
    console.log(`✅ Successfully migrated: ${migratedCount} messages`);
    console.log(`⚠️ Skipped: ${skippedCount} messages`);
    console.log(`📊 Total processed: ${migratedCount + skippedCount} messages`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

// Run migration
const runMigration = async () => {
  await connectDB();
  await migrateGroupMessages();
  mongoose.connection.close();
  console.log('🏁 Migration completed');
};

runMigration();
