const mongoose = require('mongoose');

const GroupCodeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group code name is required'],
    unique: true,
    trim: true,
    maxlength: [20, 'Group code name cannot exceed 20 characters']
  },
  majorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Major',
    required: [true, 'Major ID is required']
  },
  majorName: {
    type: String,
    required: [true, 'Major name is required']
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: [true, 'Faculty ID is required']
  },
  facultyName: {
    type: String,
    required: [true, 'Faculty name is required']
  },
  year: {
    type: Number,
    min: 2020,
    max: 2030
  },
  semester: {
    type: Number,
    min: 1,
    max: 3
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
GroupCodeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes
GroupCodeSchema.index({ name: 1 });
GroupCodeSchema.index({ majorId: 1 });
GroupCodeSchema.index({ facultyId: 1 });
GroupCodeSchema.index({ isActive: 1 });
GroupCodeSchema.index({ year: 1, semester: 1 });

module.exports = mongoose.model('GroupCode', GroupCodeSchema);