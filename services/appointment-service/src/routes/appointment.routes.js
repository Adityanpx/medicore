const express = require('express')
const router  = express.Router()
const {
  bookAppointment,
  getMyAppointments,
  getDoctorAppointments,
  cancelAppointment,
  completeAppointment,
} = require('../controllers/appointment.controller')
const { protect } = require('../middleware/auth.middleware')

router.post('/book',                         protect, bookAppointment)
router.get('/my',                            protect, getMyAppointments)
router.get('/doctor',                        protect, getDoctorAppointments)
router.patch('/cancel/:appointmentId',       protect, cancelAppointment)
router.patch('/complete/:appointmentId',     protect, completeAppointment)

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'appointment-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
})

module.exports = router
