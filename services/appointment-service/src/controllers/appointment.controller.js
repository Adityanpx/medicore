const Appointment = require('../models/appointment.model')
const logger      = require('../config/logger')
const { publishEvent } = require('../config/publisher')
const {
  patientBreaker,
  doctorBreaker,
  availabilityBreaker,
} = require('../config/circuitBreakers')

const bookAppointment = async (req, res) => {
  const { correlationId } = req

  logger.info('Appointment booking request received', {
    correlationId,
    patientId: req.user.serviceId,
    doctorId:  req.body.doctorId,
  })

  try {
    const { doctorId, date, day, timeSlot, reason } = req.body
    const patientId = req.user.serviceId

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient profile not found. Please create your profile first.',
      })
    }

    logger.debug('Fetching patient and doctor via circuit breakers', {
      correlationId, patientId, doctorId,
    })

    const [patientResult, doctorResult] = await Promise.all([
      patientBreaker.fire(patientId, correlationId),
      doctorBreaker.fire(doctorId, correlationId),
    ])

    if (!patientResult) {
      logger.error('Patient service circuit open — cannot book', { correlationId })
      return res.status(503).json({
        success: false,
        message: 'Patient service temporarily unavailable. Please try again shortly.',
        retryAfter: '30 seconds',
      })
    }

    if (!doctorResult) {
      logger.error('Doctor service circuit open — cannot book', { correlationId })
      return res.status(503).json({
        success: false,
        message: 'Doctor service temporarily unavailable. Please try again shortly.',
        retryAfter: '30 seconds',
      })
    }

    const patientData = patientResult.patient
    const doctorData  = doctorResult.doctor

    logger.debug('Patient and doctor fetched successfully', {
      correlationId,
      patientName: patientData.name,
      doctorName:  doctorData.name,
    })

    // ─── Check availability using circuit breaker ─────────────────────
    const availabilityResult = await availabilityBreaker.fire(
      doctorId, day, correlationId
    )

    if (availabilityResult.circuitOpen) {
      return res.status(503).json({
        success: false,
        message: 'Unable to verify doctor availability. Please try again shortly.',
      })
    }

    if (!availabilityResult.isAvailable) {
      logger.warn('Doctor not available on requested day', {
        correlationId, doctorId, day,
      })
      return res.status(400).json({
        success: false,
        message: `Dr. ${doctorData.name} is not available on ${day}`,
      })
    }

    // ─── Check slot conflict ──────────────────────────────────────────
    const existingAppointment = await Appointment.findOne({
      doctorId,
      date: new Date(date),
      timeSlot,
      status: { $nin: ['cancelled'] },
    })

    if (existingAppointment) {
      logger.warn('Booking failed — time slot conflict', {
        correlationId,
        doctorId,
        date,
        timeSlot,
      })
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked.',
      })
    }

    // ─── Create appointment ───────────────────────────────────────────
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      patientName:          patientData.name,
      doctorName:           doctorData.name,
      doctorSpecialization: doctorData.specialization,
      consultationFee:      doctorData.consultationFee,
      date: new Date(date),
      day,
      timeSlot,
      reason,
      status: 'confirmed',
    })

    publishEvent('appointment.completed', {
      appointmentId:        appointment._id,
      patientId:            appointment.patientId,
      patientName:          appointment.patientName,
      doctorId:             appointment.doctorId,
      doctorName:           appointment.doctorName,
      doctorSpecialization: appointment.doctorSpecialization,
      consultationFee:      appointment.consultationFee,
      date:                 appointment.date,
      timeSlot:             appointment.timeSlot,
      notes:                appointment.notes,
    }, correlationId)

    logger.info('Appointment booked successfully', {
      correlationId,
      appointmentId: appointment._id,
      patientName:   patientData.name,
      doctorName:    doctorData.name,
    })

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment,
    })
  } catch (error) {
    logger.error('Appointment booking failed', {
      correlationId,
      error: error.message,
      stack: error.stack,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to book appointment',
      error: error.message,
    })
  }
}

const getMyAppointments = async (req, res) => {
  const { correlationId } = req
  const patientId = req.user.serviceId

  logger.debug('Fetching patient appointments', { correlationId, patientId })

  try {
    const appointments = await Appointment.find({ patientId }).sort({ date: -1 })
    logger.info('Patient appointments fetched', { correlationId, patientId, count: appointments.length })
    res.status(200).json({ success: true, count: appointments.length, appointments })
  } catch (error) {
    logger.error('Failed to fetch patient appointments', { correlationId, error: error.message })
    res.status(500).json({ success: false, message: 'Failed to fetch appointments', error: error.message })
  }
}

const getDoctorAppointments = async (req, res) => {
  const { correlationId } = req
  const doctorId = req.user.serviceId

  logger.debug('Fetching doctor appointments', { correlationId, doctorId })

  try {
    const appointments = await Appointment.find({ doctorId }).sort({ date: 1 })
    logger.info('Doctor appointments fetched', { correlationId, doctorId, count: appointments.length })
    res.status(200).json({ success: true, count: appointments.length, appointments })
  } catch (error) {
    logger.error('Failed to fetch doctor appointments', { correlationId, error: error.message })
    res.status(500).json({ success: false, message: 'Failed to fetch appointments', error: error.message })
  }
}

const cancelAppointment = async (req, res) => {
  const { correlationId } = req
  const { appointmentId } = req.params

  logger.info('Cancel appointment request', { correlationId, appointmentId })

  try {
    const appointment = await Appointment.findById(appointmentId)

    if (!appointment) {
      logger.warn('Cancel failed — appointment not found', { correlationId, appointmentId })
      return res.status(404).json({ success: false, message: 'Appointment not found' })
    }

    if (appointment.patientId !== req.user.serviceId) {
      logger.warn('Cancel failed — unauthorized', { correlationId, appointmentId })
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this appointment' })
    }

    appointment.status = 'cancelled'
    await appointment.save()

    logger.info('Appointment cancelled', { correlationId, appointmentId })
    res.status(200).json({ success: true, message: 'Appointment cancelled', appointment })
  } catch (error) {
    logger.error('Failed to cancel appointment', { correlationId, error: error.message })
    res.status(500).json({ success: false, message: 'Failed to cancel appointment', error: error.message })
  }
}

const completeAppointment = async (req, res) => {
  const { correlationId } = req
  const { appointmentId } = req.params
  const { notes } = req.body

  logger.info('Complete appointment request', { correlationId, appointmentId })

  try {
    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status: 'completed', notes },
      { new: true }
    )

    if (!appointment) {
      logger.warn('Complete failed — appointment not found', { correlationId, appointmentId })
      return res.status(404).json({ success: false, message: 'Appointment not found' })
    }

    publishEvent('appointment.completed', {
      appointmentId:   appointment._id,
      patientId:       appointment.patientId,
      patientName:     appointment.patientName,
      doctorId:        appointment.doctorId,
      doctorName:      appointment.doctorName,
      doctorSpecialization: appointment.doctorSpecialization,
      consultationFee: appointment.consultationFee,
      date:            appointment.date,
      timeSlot:        appointment.timeSlot,
      notes:           appointment.notes,
    }, correlationId)

    logger.info('Appointment completed and event published', { correlationId, appointmentId })
    res.status(200).json({ success: true, message: 'Appointment completed', appointment })
  } catch (error) {
    logger.error('Failed to complete appointment', { correlationId, error: error.message })
    res.status(500).json({ success: false, message: 'Failed to complete appointment', error: error.message })
  }
}

module.exports = {
  bookAppointment,
  getMyAppointments,
  getDoctorAppointments,
  cancelAppointment,
  completeAppointment,
}
