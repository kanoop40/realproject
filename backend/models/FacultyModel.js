const mongoose = require('mongoose');

const FacultySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Faculty name is required'],
    unique: true,
    trim: true,
    maxlength: [150, 'Faculty name cannot exceed 150 characters']
  },
  shortName: {
    type: String,
    trim: true,
    maxlength: [20, 'Short name cannot exceed 20 characters']
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
FacultySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes
FacultySchema.index({ name: 1 });
FacultySchema.index({ isActive: 1 });

module.exports = mongoose.model('Faculty', FacultySchema);