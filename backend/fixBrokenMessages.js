const mongoose = require('mongoose');
const Messages = require('./models/MessagesModel');
const File = require('./models/FileModel');

const fixBrokenMessages = async () => {
    try {
        require('dotenv').config();
        await mongoose.connect(process.env.MONGO_URI);
        
        console.log('🔧 Starting message repair process...');
        
        // หาข้อความที่เสีย (messageType: text แต่ content เป็น รูปภาพ/ไฟล์แนบ)
        const brokenMessages = await Messages.find({
            messageType: 'text',
            $or: [
                { content: 'รูปภาพ' },
                { content: 'ไฟล์แนบ' }
            ]
        });
        
        console.log(`📨 Found ${brokenMessages.length} broken messages`);
        
        // หาไฟล์ที่มี Messages_id ที่ตรงกับข้อความเสีย
        for (const message of brokenMessages) {
            console.log(`\n🔧 Fixing message ${message._id}...`);
            
            // หาไฟล์ที่เชื่อมโยงกับข้อความนี้
            const file = await File.findOne({ Messages_id: message._id });
            
            if (file) {
                console.log(`✅ Found linked file: ${file.file_name}`);
                
                // อัปเดตข้อความให้มีข้อมูลไฟล์
                const isImage = file.file_type && file.file_type.startsWith('image/');
                
                const updateData = {
                    messageType: isImage ? 'image' : 'file',
                    file_id: file._id,
                    fileUrl: file.url,
                    fileName: file.file_name,
                    fileSize: parseInt(file.size) || 0,
                    mimeType: file.file_type
                };
                
                await Messages.findByIdAndUpdate(message._id, updateData);
                
                console.log(`✅ Updated message with:`, {
                    messageType: updateData.messageType,
                    fileName: updateData.fileName,
                    fileSize: updateData.fileSize
                });
            } else {
                console.log(`❌ No linked file found for message ${message._id}`);
            }
        }
        
        console.log('\n🎉 Message repair completed!');
        
        // ตรวจสอบผลลัพธ์
        const fixedMessages = await Messages.find({
            $or: [
                { content: 'รูปภาพ' },
                { content: 'ไฟล์แนบ' }
            ]
        });
        
        console.log('\n📊 Final status:');
        fixedMessages.forEach(msg => {
            console.log(`  ${msg._id}: ${msg.content} -> ${msg.messageType} (${msg.fileName || 'no file'})`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

fixBrokenMessages();