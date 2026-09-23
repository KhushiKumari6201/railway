const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['ADMIN', 'CONTROLLER', 'PLANNER', 'MAINTENANCE_OFFICER', 'VIEWER'],
      default: 'VIEWER',
      index: true,
    },
    department: {
      type: String,
      required: true,
      enum: ['Operating', 'Civil Engineering', 'S&T', 'Traction Distribution', 'General'],
      default: 'General',
    },
    employeeCode: { type: String, required: true },
    active: { type: Boolean, default: true, index: true },
    lastLogin: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('User', UserSchema)
