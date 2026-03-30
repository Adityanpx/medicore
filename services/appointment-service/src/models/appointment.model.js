const mongoose = require('mongoose')

const appointmentSchema = new mongoose.Schema(
  {
    // IDs linking to other services
    patientId:   { type: String, required: true },
    doctorId:    { type: String, required: true },

    // Snapshot data — stored here so we don't need
    // to call other services every time we fetch appointments
    // This is intentional data duplication — normal in microservices
    patientName: { type: String, required: true },
    doctorName:  { type: String, required: true },
    doctorSpecialization: { type: String },
    consultationFee:      { type: Number, required: true },

    // Appointment details
    date:        { type: Date, required: true },
    day:         { type: String, required: true },  // "Monday"
    timeSlot:    { type: String, required: true },  // "10:00 - 11:00"
    reason:      { type: String },
    notes:       { type: String },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },

    // Will be used in Phase 7 when billing-service
    // listens for appointment completion events
    billGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Appointment', appointmentSchema)
