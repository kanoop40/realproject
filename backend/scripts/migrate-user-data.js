const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const User = require('../models/UserModel');
const Department = require('../models/DepartmentModel');
const Faculty = require('../models/FacultyModel');
const Major = require('../models/MajorModel');
const GroupCode = require('../models/GroupCodeModel');

const migrateUsersWithMissingData = async () => {
  try {
    console.log('🔄 Starting migration for users with missing data...');
    
    // Connect to database
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      console.error('❌ MONGO_URI environment variable is required');
      process.exit(1);
    }
    
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected Successfully');
    
    // Get all existing users
    const users = await User.find({}).lean();
    console.log(`📊 Found ${users.length} total users`);

    // Get default data
    const defaultDepartment = await Department.findOne({ name: 'งานทะเบียน' });
    const defaultFaculty = await Faculty.findOne({ name: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ' });
    const defaultMajor = await Major.findOne({ name: '345 เทคโนโลยีธุรกิจดิจิทัล' });
    const defaultGroupCode = await GroupCode.findOne({ name: 'DT26721N' });

    if (!defaultDepartment || !defaultFaculty || !defaultMajor || !defaultGroupCode) {
      console.error('❌ Default data not found. Please run initialize-system-data.js first');
      return;
    }

    console.log('🔧 Default values:');
    console.log(`   Department: ${defaultDepartment.name} (${defaultDepartment._id})`);
    console.log(`   Faculty: ${defaultFaculty.name} (${defaultFaculty._id})`);
    console.log(`   Major: ${defaultMajor.name} (${defaultMajor._id})`);
    console.log(`   GroupCode: ${defaultGroupCode.name} (${defaultGroupCode._id})`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        let needsUpdate = false;
        const updateData = {};

        // Check and fix department
        if (!user.department || typeof user.department === 'string') {
          if (typeof user.department === 'string') {
            // Try to find matching department
            const dept = await Department.findOne({ 
              name: { $regex: new RegExp(user.department, 'i') }
            });
            updateData.department = dept ? dept._id : defaultDepartment._id;
            console.log(`🔄 User ${user.email}: Migrating department '${user.department}' -> ${dept ? dept.name : defaultDepartment.name}`);
          } else {
            updateData.department = defaultDepartment._id;
            console.log(`🔄 User ${user.email}: Setting default department -> ${defaultDepartment.name}`);
          }
          needsUpdate = true;
        }

        // Check and fix faculty
        if (!user.faculty || typeof user.faculty === 'string') {
          if (typeof user.faculty === 'string') {
            // Try to find matching faculty
            const faculty = await Faculty.findOne({ 
              name: { $regex: new RegExp(user.faculty, 'i') }
            });
            updateData.faculty = faculty ? faculty._id : defaultFaculty._id;
            console.log(`🔄 User ${user.email}: Migrating faculty '${user.faculty}' -> ${faculty ? faculty.name : defaultFaculty.name}`);
          } else {
            updateData.faculty = defaultFaculty._id;
            console.log(`🔄 User ${user.email}: Setting default faculty -> ${defaultFaculty.name}`);
          }
          needsUpdate = true;
        }

        // Check and fix major (only for students)
        if (user.role === 'student') {
          if (!user.major || typeof user.major === 'string') {
            if (typeof user.major === 'string') {
              // Try to find matching major
              const major = await Major.findOne({ 
                name: { $regex: new RegExp(user.major, 'i') }
              });
              updateData.major = major ? major._id : defaultMajor._id;
              console.log(`🔄 User ${user.email}: Migrating major '${user.major}' -> ${major ? major.name : defaultMajor.name}`);
            } else {
              updateData.major = defaultMajor._id;
              console.log(`🔄 User ${user.email}: Setting default major -> ${defaultMajor.name}`);
            }
            needsUpdate = true;
          }

          // Check and fix groupCode (only for students)
          if (!user.groupCode || typeof user.groupCode === 'string') {
            if (typeof user.groupCode === 'string') {
              // Try to find matching group code
              const groupCode = await GroupCode.findOne({ 
                name: { $regex: new RegExp(user.groupCode, 'i') }
              });
              updateData.groupCode = groupCode ? groupCode._id : defaultGroupCode._id;
              console.log(`🔄 User ${user.email}: Migrating groupCode '${user.groupCode}' -> ${groupCode ? groupCode.name : defaultGroupCode.name}`);
            } else {
              updateData.groupCode = defaultGroupCode._id;
              console.log(`🔄 User ${user.email}: Setting default groupCode -> ${defaultGroupCode.name}`);
            }
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await User.findByIdAndUpdate(user._id, updateData);
          migratedCount++;
          console.log(`✅ Migrated user: ${user.email}`);
        } else {
          skippedCount++;
          console.log(`⏭️  Skipped user: ${user.email} (already has valid data)`);
        }

      } catch (error) {
        console.error(`❌ Error migrating user ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 Migration completed:`);
    console.log(`   ✅ Migrated: ${migratedCount} users`);
    console.log(`   ⏭️  Skipped: ${skippedCount} users`);
    console.log(`   ❌ Errors: ${errorCount} users`);

    // Show sample of migrated users
    const sampleUsers = await User.find({})
      .populate('department', 'name')
      .populate('faculty', 'name')
      .populate('major', 'name')
      .populate('groupCode', 'name')
      .limit(3);

    console.log('\n📋 Sample migrated users:');
    sampleUsers.forEach(user => {
      console.log(`   ${user.email}:`);
      console.log(`     Department: ${user.department?.name || 'N/A'}`);
      console.log(`     Faculty: ${user.faculty?.name || 'N/A'}`);
      console.log(`     Major: ${user.major?.name || 'N/A'}`);
      console.log(`     GroupCode: ${user.groupCode?.name || 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run if called directly
if (require.main === module) {
  migrateUsersWithMissingData();
}

module.exports = { migrateUsersWithMissingData };