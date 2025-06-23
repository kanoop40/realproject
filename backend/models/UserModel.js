const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      auto: true,
      primary: true
    },
    username: { 
      type: String, 
      required: true, 
      unique: true 
    },
    password: { 
      type: String, 
      required: true 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true 
    },
    firstName: { 
      type: String, 
      required: true 
    },
    lastName: { 
      type: String, 
      required: true 
    },
    faculty: { 
      type: String 
    },
    major: { 
      type: String 
    },
    groupCode: { 
      type: String 
    },
    avatar: {
      type: String,
      default: "default-avatar-url"
    },
    role: {
      type: String,
      required: true,
      enum: ['student', 'teacher', 'staff', 'admin'],
      default: 'student'
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    }
  }
);