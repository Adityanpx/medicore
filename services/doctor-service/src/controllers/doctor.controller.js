const Doctor = require('../models/doctor.model')
const axios  = require('axios')

// Create doctor profile
const createProfile = async (req, res) => {
  try {
    const {
      name, email, specialization, qualifications,
      experience, consultationFee, phone, availability,
    } = req.body

    const userId = req.user.id

    const existingDoctor = await Doctor.findOne({ userId })
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: 'Doctor profile already exists',
      })
    }

    const doctor = await Doctor.create({
      userId, name, email, specialization,
      qualifications, experience, consultationFee,
      phone, availability,
    })

    // Tell auth-service about this doctor's serviceId
    await axios.patch(
      `${process.env.AUTH_SERVICE_URL}/api/auth/update-service-id`,
      { userId, serviceId: doctor._id },
      { headers: { Authorization: req.headers.authorization } }
    )

    res.status(201).json({ success: true, message: 'Doctor profile created', doctor })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create profile',
      error: error.message,
    })
  }
}

// Get my profile
const getMyProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user.id })
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' })
    }
    res.status(200).json({ success: true, doctor })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile', error: error.message })
  }
}

// Get all doctors — patients use this to browse
const getAllDoctors = async (req, res) => {
  try {
    const { specialization } = req.query
    const filter = { isActive: true }
    if (specialization) filter.specialization = specialization

    const doctors = await Doctor.find(filter).select(
      'name specialization qualifications experience consultationFee rating availability'
    )
    res.status(200).json({ success: true, count: doctors.length, doctors })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch doctors', error: error.message })
  }
}

// Update availability
const updateAvailability = async (req, res) => {
  try {
    const { availability } = req.body
    const doctor = await Doctor.findOneAndUpdate(
      { userId: req.user.id },
      { availability },
      { new: true }
    )
    res.status(200).json({ success: true, message: 'Availability updated', doctor })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update availability', error: error.message })
  }
}

// ─── INTERNAL ROUTE CONTROLLER ────────────────────────────────────────────────
// Called by appointment-service — not by frontend
const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' })
    }
    res.status(200).json({ success: true, doctor })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch doctor', error: error.message })
  }
}

// Check if doctor is available on a specific day
// appointment-service calls this before confirming a booking
const checkAvailability = async (req, res) => {
  try {
    const { doctorId, day } = req.query
    const doctor = await Doctor.findById(doctorId)

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' })
    }

    const slot = doctor.availability.find(
      a => a.day === day && a.isAvailable === true
    )

    res.status(200).json({
      success: true,
      isAvailable: !!slot,
      slot: slot || null,
      consultationFee: doctor.consultationFee,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Availability check failed', error: error.message })
  }
}

module.exports = {
  createProfile,
  getMyProfile,
  getAllDoctors,
  updateAvailability,
  getDoctorById,
  checkAvailability,
}
