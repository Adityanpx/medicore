const Patient = require('../models/patient.model')
const axios = require('axios')

// Create patient profile — called right after registration
const createProfile = async (req, res) => {
  try {
    const { name, email, dateOfBirth, gender, phone, address, bloodGroup } = req.body

    // req.user comes from our auth middleware (which called auth-service)
    const userId = req.user.id

    // Check if profile already exists
    const existingPatient = await Patient.findOne({ userId })
    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: 'Patient profile already exists',
      })
    }

    const patient = await Patient.create({
      userId,
      name,
      email,
      dateOfBirth,
      gender,
      phone,
      address,
      bloodGroup,
    })

    // Now tell auth-service about this patient's serviceId
    // so auth-service can link the user to this profile
    await axios.patch(
      `${process.env.AUTH_SERVICE_URL}/api/auth/update-service-id`,
      { userId, serviceId: patient._id },
      { headers: { Authorization: req.headers.authorization } }
    )

    res.status(201).json({
      success: true,
      message: 'Patient profile created',
      patient,
    })
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
    const patient = await Patient.findOne({ userId: req.user.id })

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found',
      })
    }

    res.status(200).json({
      success: true,
      patient,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message,
    })
  }
}

// Get patient by ID — called by other services like appointment-service
// This is an internal endpoint
const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      })
    }

    res.status(200).json({
      success: true,
      patient,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient',
      error: error.message,
    })
  }
}

// Update medical history
const addMedicalHistory = async (req, res) => {
  try {
    const { condition, diagnosedAt, notes } = req.body

    const patient = await Patient.findOneAndUpdate(
      { userId: req.user.id },
      {
        $push: {
          medicalHistory: { condition, diagnosedAt, notes },
        },
      },
      { new: true }
    )

    res.status(200).json({
      success: true,
      message: 'Medical history updated',
      patient,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update medical history',
      error: error.message,
    })
  }
}

module.exports = { createProfile, getMyProfile, getPatientById, addMedicalHistory }
