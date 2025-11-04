const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/UserModel');

// Import the existing database connection
const connectDB = require('../config/db');

// Import existing models
const Department = require('../models/DepartmentModel');
const Faculty = require('../models/FacultyModel');
const Major = require('../models/MajorModel');
const GroupCode = require('../models/GroupCodeModel');

// Initial data to insert
const initialData = {
  departments: [
    { name: 'งานการเงิน' },
    { name: 'งานบุคลากร' },
    { name: 'งานทะเบียน' },
    { name: 'กองทุนเงินกู้ กยศ' }
  ],
  faculties: [
    { name: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ' }
  ],
  majors: [
    { name: '345 เทคโนโลยีธุรกิจดิจิทัล' },
    { name: '346 การบัญชี' },
    { name: '347 การจัดการ' },
    { name: '348 การตลาด' }
  ],
  groupCodes: [
    // DT Groups
    { name: 'DT26721N', majorName: '345 เทคโนโลยีธุรกิจดิจิทัล' },
    { name: 'DT26722N', majorName: '345 เทคโนโลยีธุรกิจดิจิทัล' },
    { name: 'DT26723N', majorName: '345 เทคโนโลยีธุรกิจดิจิทัล' },
    // ACC Groups
    { name: 'ACC26701', majorName: '346 การบัญชี' },
    { name: 'ACC26702', majorName: '346 การบัญชี' },
    // MGT Groups
    { name: 'MGT26701', majorName: '347 การจัดการ' },
    { name: 'MGT26702', majorName: '347 การจัดการ' },
    // MKT Groups
    { name: 'MKT26701', majorName: '348 การตลาด' },
    { name: 'MKT26702', majorName: '348 การตลาด' }
  ]
};

// Function to populate initial data
const populateInitialData = async () => {
  try {

    console.log('🏗️  Starting data population...');

    // 1. Insert Departments
    console.log('📁 Inserting departments...');
    const departments = await Department.insertMany(initialData.departments);
    console.log(`✅ Inserted ${departments.length} departments`);

    // 2. Insert Faculties
    console.log('🏛️  Inserting faculties...');
    const faculties = await Faculty.insertMany(initialData.faculties);
    console.log(`✅ Inserted ${faculties.length} faculties`);

    // 3. Insert Majors (with faculty reference)
    console.log('📚 Inserting majors...');
    const facultyId = faculties[0]._id;
    const facultyName = faculties[0].name;
    
    const majorsToInsert = initialData.majors.map(major => ({
      ...major,
      facultyId,
      facultyName
    }));
    
    const majors = await Major.insertMany(majorsToInsert);
    console.log(`✅ Inserted ${majors.length} majors`);

    // 4. Insert Group Codes (with major and faculty references)
    console.log('👥 Inserting group codes...');
    const groupCodesToInsert = [];
    
    for (const groupCode of initialData.groupCodes) {
      const major = majors.find(m => m.name === groupCode.majorName);
      if (major) {
        groupCodesToInsert.push({
          name: groupCode.name,
          majorId: major._id,
          majorName: major.name,
          facultyId: major.facultyId,
          facultyName: major.facultyName
        });
      }
    }
    
    const groupCodes = await GroupCode.insertMany(groupCodesToInsert);
    console.log(`✅ Inserted ${groupCodes.length} group codes`);

    // Return created data for reference
    return { departments, faculties, majors, groupCodes };

  } catch (error) {
    console.error('❌ Error populating data:', error);
    throw error;
  }
};

// Function to migrate existing users
const migrateExistingUsers = async () => {
  try {
    console.log('🔄 Starting user migration...');
    
    // Get all existing users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} existing users`);

    if (users.length === 0) {
      console.log('ℹ️  No users to migrate');
      return;
    }

    // Models are already imported
    
    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      try {
        let updated = false;

        // Migrate department if it's a string
        if (user.department && typeof user.department === 'string') {
          const department = await Department.findOne({ name: user.department });
          if (department) {
            user.department = department._id;
            updated = true;
            console.log(`🔄 Migrated department for user ${user.email}: ${department.name}`);
          } else {
            console.log(`⚠️  Department not found for user ${user.email}: ${user.department}`);
          }
        }

        // Migrate faculty if it's a string
        if (user.faculty && typeof user.faculty === 'string') {
          const faculty = await Faculty.findOne({ name: user.faculty });
          if (faculty) {
            user.faculty = faculty._id;
            updated = true;
            console.log(`🔄 Migrated faculty for user ${user.email}: ${faculty.name}`);
          }
        }

        // Migrate major if it's a string
        if (user.major && typeof user.major === 'string') {
          const major = await Major.findOne({ name: user.major });
          if (major) {
            user.major = major._id;
            updated = true;
            console.log(`🔄 Migrated major for user ${user.email}: ${major.name}`);
          }
        }

        // Migrate groupCode if it's a string
        if (user.groupCode && typeof user.groupCode === 'string') {
          const groupCode = await GroupCode.findOne({ name: user.groupCode });
          if (groupCode) {
            user.groupCode = groupCode._id;
            updated = true;
            console.log(`🔄 Migrated group code for user ${user.email}: ${groupCode.name}`);
          }
        }

        if (updated) {
          await user.save();
          migratedCount++;
          console.log(`✅ Migrated user: ${user.email}`);
        } else {
          skippedCount++;
          console.log(`⏭️  Skipped user: ${user.email} (no migration needed)`);
        }

      } catch (error) {
        console.error(`❌ Error migrating user ${user.email}:`, error.message);
        skippedCount++;
      }
    }

    console.log(`🎉 Migration completed:`);
    console.log(`   ✅ Migrated: ${migratedCount} users`);
    console.log(`   ⏭️  Skipped: ${skippedCount} users`);

  } catch (error) {
    console.error('❌ Error during user migration:', error);
    throw error;
  }
};

// Main execution function
const main = async () => {
  try {
    console.log('🚀 Starting database initialization...');
    
    // Connect to database
    await connectDB();
    
    // Check if data already exists
    const existingDepartments = await Department.countDocuments();
    
    if (existingDepartments > 0) {
      console.log('ℹ️  System data already exists. Skipping population...');
    } else {
      // Populate initial data
      await populateInitialData();
    }
    
    // Migrate existing users
    await migrateExistingUsers();
    
    console.log('🎉 Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  populateInitialData,
  migrateExistingUsers
};