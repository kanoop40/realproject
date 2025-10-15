const mongoose = require('mongoose');
const Messages = require('./models/MessagesModel');
const File = require('./models/FileModel');

const checkData = async () => {
    try {
        require('dotenv').config();
        await mongoose.connect(process.env.MONGO_URI);
        
        console.log('🔍 Checking message data...');
        
        // หาข้อความที่มี content เป็น "รูปภาพ" หรือ "ไฟล์แนบ"
        const messages = await Messages.find({
            $or: [
                { content: 'รูปภาพ' },
                { content: 'ไฟล์แนบ' }
            ]
        }).populate('file_id').limit(10);
        
        console.log(`📨 Found ${messages.length} messages with image/file content`);
        
        messages.forEach((msg, index) => {
            console.log(`\n📝 Message ${index + 1}:`);
            console.log(`  ID: ${msg._id}`);
            console.log(`  Content: ${msg.content}`);
            console.log(`  MessageType: ${msg.messageType}`);
            console.log(`  FileUrl: ${msg.fileUrl}`);
            console.log(`  FileName: ${msg.fileName}`);
            console.log(`  FileSize: ${msg.fileSize}`);
            console.log(`  MimeType: ${msg.mimeType}`);
            console.log(`  File_ID: ${msg.file_id ? msg.file_id._id : 'null'}`);
            if (msg.file_id) {
                console.log(`  File Details: ${JSON.stringify({
                    file_name: msg.file_id.file_name,
                    url: msg.file_id.url,
                    size: msg.file_id.size,
                    file_type: msg.file_id.file_type
                }, null, 2)}`);
            }
        });
        
        // หาไฟล์ที่ไม่ได้เชื่อมโยงกับข้อความ
        const orphanFiles = await File.find({
            Messages_id: { $exists: true }
        }).limit(5);
        
        console.log(`\n📁 Found ${orphanFiles.length} files with Messages_id`);
        orphanFiles.forEach((file, index) => {
            console.log(`\n📁 File ${index + 1}:`);
            console.log(`  ID: ${file._id}`);
            console.log(`  Name: ${file.file_name}`);
            console.log(`  URL: ${file.url}`);
            console.log(`  Messages_ID: ${file.Messages_id}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

checkData();