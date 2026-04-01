const Patient = require('../models/patient.model')
const axios = require('axios')
const logger = require('../config/logger')

const createProfile = async (req, res) => {
  const { correlationId } = req

  logger.info('Patient profile creation request', { correlationId, userId: req.user.id })

  try {
    const { name, email, dateOfBirth, gender, phone, address, bloodGroup } = req.body
    const userId = req.user.id

    const existingPatient = await Patient.findOne({ userId })
    if (existingPatient) {
      logger.warn('Profile creation failed — profile already exists', { correlationId, userId })
      return res.status(400).json({
        success: false,
        message: 'Patient profile already exists',
      })
    }

    const patient = await Patient.create({
      userId, name, email, dateOfBirth, gender, phone, address, bloodGroup,
    })

    await axios.patch(
      `${process.env.AUTH_SERVICE_URL}/api/auth/update-service-id`,
      { userId, serviceId: patient._id },
      {
        headers: {
          Authorization: req.headers.authorization,
          'x-correlation-id': correlationId,
        },
      }
    )

    logger.info('Patient profile created', { correlationId, patientId: patient._id, name })
    res.status(201).json({ success: true, message: 'Patient profile created', patient })
  } catch (error) {
    logger.error('Patient profile creation failed', { correlationId, error: error.message })
    res.status(500).json({ success: false, message: 'Failed to create profile', error: error.message })
  }
}

const getMyProfile = async (req, res) => {
  const { correlationId } = req

  try {
    const patient = await Patient.findOne({ userId: req.user.id })
    if (!patient) {
      logger.warn('Profile not found', { correlationId, userId: req.user.id })
      return res.status(404).json({ success: false, message: 'Patient profile not found' })
    }

    logger.debug('Patient profile fetched', { correlationId, patientId: patient._id })
    res.status(200).json({ success: true, patient })
  } catch (error) {
    logger.error('Failed to fetch patient profile', { correlationId, error: error.message })
    res.status(500).json({ success: false, message: 'Failed to fetch profile', error: error.message })
  }
}

const getPatientById = async (req, res) => {
  const { correlationId } = req

  logger.debug('Internal patient lookup', { correlationId, patientId: req.params.id })

  try {
    const patient = await Patient.findById(req.params.id)
    if (!patient) {
      logger.warn('Patient not found', { correlationId, patientId: req.params.id })
      return res.status(404).json({ success: false, message: 'Patient not found' })
    }

    logger.debug('Patient found', { correlationId, patientId: patient._id, name: patient.name })
    res.status(200).json({ success: true, patient })
  } catch (error) {
    logger.error('Failed to fetch patient', { correlationId, error: error.message })
    res.status(500).json({ success: false, message: 'Failed to fetch patient', error: error.message })
  }
}

const addMedicalHistory = async (req, res) => {
  const { correlationId } = req

  try {
    const { condition, diagnosedAt, notes } = req.body

    const patient = await Patient.findOneAndUpdate(
      { userId: req.user.id },
      { $push: { medicalHistory: { condition, diagnosedAt, notes } } },
      { new: true }
    )

    logger.info('Medical history updated', { correlationId, userId: req.user.id, condition })
    res.status(200).json({ success: true, message: 'Medical history updated', patient })
  } catch (error) {
    logger.error('Failed to update medical history', { correlationId, error: error.message })
    res.status(500).json({ success: false, message: 'Failed to update medical history', error: error.message })
  }
}

module.exports = { createProfile, getMyProfile, getPatientById, addMedicalHistory }
