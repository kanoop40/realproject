const mongoose = require('mongoose');

const MajorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Major name is required'],
    trim: true,
    maxlength: [150, 'Major name cannot exceed 150 characters']
  },
  code: {
    type: String,
    trim: true,
    maxlength: [10, 'Major code cannot exceed 10 characters']
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
MajorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create compound index for faculty and major name uniqueness
MajorSchema.index({ facultyId: 1, name: 1 }, { unique: true });
MajorSchema.index({ facultyId: 1 });
MajorSchema.index({ isActive: 1 });

module.exports = mongoose.model('Major', MajorSchema);