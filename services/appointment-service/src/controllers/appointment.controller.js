const Appointment = require('../models/appointment.model')
const axios       = require('axios')

// Book appointment
// This function demonstrates real synchronous inter-service communication
const bookAppointment = async (req, res) => {
  try {
    const { doctorId, date, day, timeSlot, reason } = req.body

    // req.user comes from auth middleware which called auth-service
    const patientId = req.user.serviceId

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient profile not found. Please create your profile first.',
      })
    }

    // ─── STEP 1: Call patient-service AND doctor-service simultaneously ───
    // Promise.all fires both HTTP calls at the same time
    // We don't wait for patient then wait for doctor — both happen together
    // If either fails, the catch block handles it
    let patientData, doctorData

    try {
      const [patientResponse, doctorResponse] = await Promise.all([
        axios.get(`${process.env.PATIENT_SERVICE_URL}/api/patients/internal/${patientId}`),
        axios.get(`${process.env.DOCTOR_SERVICE_URL}/api/doctors/internal/${doctorId}`),
      ])
      patientData = patientResponse.data.patient
      doctorData  = doctorResponse.data.doctor
    } catch (serviceError) {
      // If either service is down or returns 404
      // we catch here and return a clear error
      // appointment-service itself does NOT crash
      return res.status(503).json({
        success: false,
        message: 'Unable to verify patient or doctor details. Please try again.',
        error: serviceError.message,
      })
    }

    // ─── STEP 2: Check doctor availability for requested day ──────────────
    const availabilityResponse = await axios.get(
      `${process.env.DOCTOR_SERVICE_URL}/api/doctors/internal/availability`,
      { params: { doctorId, day } }
    )

    if (!availabilityResponse.data.isAvailable) {
      return res.status(400).json({
        success: false,
        message: `Dr. ${doctorData.name} is not available on ${day}`,
      })
    }

    // ─── STEP 3: Check for conflicting appointments ───────────────────────
    const existingAppointment = await Appointment.findOne({
      doctorId,
      date: new Date(date),
      timeSlot,
      status: { $nin: ['cancelled'] },
    })

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked. Please choose another.',
      })
    }

    // ─── STEP 4: Create appointment with snapshot data ────────────────────
    // We store patient name and doctor name directly in this document
    // This is intentional — avoids calling other services every time
    // someone fetches their appointments
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      patientName:          patientData.name,
      doctorName:           doctorData.name,
      doctorSpecialization: doctorData.specialization,
      consultationFee:      doctorData.consultationFee,
      date:                 new Date(date),
      day,
      timeSlot,
      reason,
      status: 'confirmed',
    })

    // In Phase 7 — after creating the appointment we will publish
    // an event to RabbitMQ so billing-service can automatically
    // generate a bill. For now we just return the appointment.

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to book appointment',
      error: error.message,
    })
  }
}

// Get my appointments — for patient
const getMyAppointments = async (req, res) => {
  try {
    const patientId = req.user.serviceId
    const appointments = await Appointment.find({ patientId })
      .sort({ date: -1 })

    res.status(200).json({ success: true, count: appointments.length, appointments })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch appointments', error: error.message })
  }
}

// Get appointments for a doctor
const getDoctorAppointments = async (req, res) => {
  try {
    // Find the doctor's serviceId from auth user
    const doctorId = req.user.serviceId
    const appointments = await Appointment.find({ doctorId })
      .sort({ date: 1 })

    res.status(200).json({ success: true, count: appointments.length, appointments })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch appointments', error: error.message })
  }
}

// Cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params
    const appointment = await Appointment.findById(appointmentId)

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' })
    }

    // Only the patient who booked can cancel
    if (appointment.patientId !== req.user.serviceId) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this appointment' })
    }

    appointment.status = 'cancelled'
    await appointment.save()

    res.status(200).json({ success: true, message: 'Appointment cancelled', appointment })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel appointment', error: error.message })
  }
}

// Complete appointment — doctor marks it done
const completeAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params
    const { notes } = req.body

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status: 'completed', notes },
      { new: true }
    )

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' })
    }

    // Phase 7 — this is where we will publish
    // an "appointment.completed" event to RabbitMQ
    // so billing-service generates the bill automatically

    res.status(200).json({ success: true, message: 'Appointment completed', appointment })
  } catch (error) {
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
