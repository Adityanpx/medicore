const Doctor = require('../models/doctor.model')
const axios  = require('axios')
const logger = require('../config/logger')

const createProfile = async (req, res) => {
  const { correlationId } = req

  logger.info('Doctor profile creation request', { correlationId, userId: req.user.id })

  try {
    const {
      name, email, specialization, qualifications,
      experience, consultationFee, phone, availability,
    } = req.body

    const userId = req.user.id

    const existingDoctor = await Doctor.findOne({ userId })
    if (existingDoctor) {
      logger.warn('Profile creation failed — profile already exists', { correlationId, userId })
      return res.status(400).json({ success: false, message: 'Doctor profile already exists' })
    }

    const doctor = await Doctor.create({
      userId, name, email, specialization,
      qualifications, experience, consultationFee,
      phone, availability,
    })

    await axios.patch(
      `${process.env.AUTH_SERVICE_URL}/api/auth/update-service-id`,
      { userId, serviceId: doctor._id },
      {
        headers: {
          Authorization: req.headers.authorization,
          'x-correlation-id': correlationId,
        },
      }
    )

    logger.info('Doctor profile created', { correlationId, doctorId: doctor._id, name })
    res.status(201).json({ success: true, message: 'Doctor profile created', doctor })
  } catch (error) {
    logger.error('Doctor profile creation failed', { correlationId, error: error.message })
    res.status(500).json({ success: false, message: 'Failed to create profile', error: error.message })
  }
}

const getMyProfile = async (req, res) => {
  const { correlationId } = req

  try {
    const doctor = await Doctor.findOne({ userId: req.user.id })
    if (!doctor) {
      logger.warn('Profile not found', { correlationId, userId: req.user.id })
      return res.status(404).json({ success: false, message: 'Doctor profile not found' })
    }

    logger.debug('Doctor profile fetched', { correlationId, doctorId: doctor._id })
    res.status(200).json({ success: true, doctor })
  } catch (error) {
    logger.error('Failed to fetch doctor profile', { correlationId, error: error.message })
    res.status(500).json({ success: false, message: 'Failed to fetch profile', error: error.message })
  }
}

const getAllDoctors = async (req, res) => {
  const { correlationId } = req

  try {
    const { specialization } = req.query
    const filter = { isActive: true }
    if (specialization) filter.specialization = specialization

    const doctors = await Doctor.find(filter).select(
      'name specialization qualifications experience consultationFee rating availability'
    )

    logger.info('Doctors fetched', { correlationId, count: doctors.length, specialization })
    res.status(200).json({ success: true, count: doctors.length, doctors })
  } catch (error) {
    logger.error('Failed to fetch doctors', { correlationId, error: error.message })
    res.status(500).json({ success: false, message: 'Failed to fetch doctors', error: error.message })
  }
}

const updateAvailability = async (req, res) => {
  const { correlationId } = req

  try {
    const { availability } = req.body
    const doctor = await Doctor.findOneAndUpdate(
      { userId: req.user.id },
      { availability },
      { new: true }
    )

    logger.info('Availability updated', { correlationId, doctorId: doctor._id })
    res.status(200).json({ success: true, message: 'Availability updated', doctor })
  } catch (error) {
    logger.error('Failed to update availability', { correlationId, error: error.message })
    res.status(500).json({ success: false, message: 'Failed to update availability', error: error.message })
  }
}

const getDoctorById = async (req, res) => {
  const { correlationId } = req

  logger.debug('Internal doctor lookup', { correlationId, doctorId: req.params.id })

  try {
    const doctor = await Doctor.findById(req.params.id)
    if (!doctor) {
      logger.warn('Doctor not found', { correlationId, doctorId: req.params.id })
      return res.status(404).json({ success: false, message: 'Doctor not found' })
    }

    logger.debug('Doctor found', { correlationId, doctorId: doctor._id, name: doctor.name })
    res.status(200).json({ success: true, doctor })
  } catch (error) {
    logger.error('Failed to fetch doctor', { correlationId, error: error.message })
    res.status(500).json({ success: false, message: 'Failed to fetch doctor', error: error.message })
  }
}

const checkAvailability = async (req, res) => {
  const { correlationId } = req
  const { doctorId, day } = req.query

  logger.debug('Availability check', { correlationId, doctorId, day })

  try {
    const doctor = await Doctor.findById(doctorId)
    if (!doctor) {
      logger.warn('Doctor not found for availability check', { correlationId, doctorId })
      return res.status(404).json({ success: false, message: 'Doctor not found' })
    }

    const slot = doctor.availability.find(
      a => a.day === day && a.isAvailable === true
    )

    logger.debug('Availability check result', { correlationId, doctorId, day, isAvailable: !!slot })
    res.status(200).json({
      success: true,
      isAvailable: !!slot,
      slot: slot || null,
      consultationFee: doctor.consultationFee,
    })
  } catch (error) {
    logger.error('Availability check failed', { correlationId, error: error.message })
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
