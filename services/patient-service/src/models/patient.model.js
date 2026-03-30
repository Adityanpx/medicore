const mongoose = require('mongoose')

const patientSchema = new mongoose.Schema(
  {
    // This links back to the user in auth-service
    // We store it but we don't JOIN — that's not how microservices work
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    phone: {
      type: String,
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    medicalHistory: [
      {
        condition: String,
        diagnosedAt: Date,
        notes: String,
      },
    ],
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Patient', patientSchema)
