const express = require('express')
const router  = express.Router()
const {
  createProfile, getMyProfile, getAllDoctors,
  updateAvailability, getDoctorById, checkAvailability,
} = require('../controllers/doctor.controller')
const { protect, doctorOnly } = require('../middleware/auth.middleware')

// Public — anyone can browse doctors
router.get('/', getAllDoctors)

// Protected — only logged in doctors
router.post('/profile',              protect, doctorOnly, createProfile)
router.get('/profile/me',            protect, doctorOnly, getMyProfile)
router.patch('/availability',        protect, doctorOnly, updateAvailability)

// Internal — only called by other services
router.get('/internal/:id',          getDoctorById)
router.get('/internal/availability', checkAvailability)

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'doctor-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
})

module.exports = router
