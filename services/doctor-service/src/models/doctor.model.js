const mongoose = require('mongoose')

const availabilitySlotSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
    required: true,
  },
  startTime: { type: String, required: true }, // "09:00"
  endTime:   { type: String, required: true }, // "17:00"
  isAvailable: { type: Boolean, default: true },
})

const doctorSchema = new mongoose.Schema(
  {
    // Links to the user record in auth-service
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    name:           { type: String, required: true },
    email:          { type: String, required: true },
    specialization: {
      type: String,
      required: true,
      enum: [
        'Cardiology',
        'Neurology',
        'Orthopedics',
        'Pediatrics',
        'Dermatology',
        'General Medicine',
        'Gynecology',
        'Psychiatry',
      ],
    },
    qualifications: [{ type: String }],  // ["MBBS", "MD", "DM"]
    experience:     { type: Number, required: true }, // years
    consultationFee:{ type: Number, required: true },
    phone:          { type: String },
    availability:   [availabilitySlotSchema],
    isActive:       { type: Boolean, default: true },
    rating: {
      average: { type: Number, default: 0 },
      count:   { type: Number, default: 0 },
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Doctor', doctorSchema)
