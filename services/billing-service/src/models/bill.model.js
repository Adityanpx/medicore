const mongoose = require('mongoose')

const billSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, required: true, unique: true },

    patientId:   { type: String, required: true },
    patientName: { type: String, required: true },

    doctorId:             { type: String, required: true },
    doctorName:           { type: String, required: true },
    doctorSpecialization: { type: String },

    consultationFee: { type: Number, required: true },
    taxes: {
      gst: { type: Number, default: 0 },
    },
    totalAmount: { type: Number, required: true },

    appointmentDate: { type: Date },
    timeSlot:        { type: String },
    notes:           { type: String },

    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending',
    },

    sourceEventId: { type: String },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Bill', billSchema)
