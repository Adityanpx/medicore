const express = require('express')
const router = express.Router()
const {
  createProfile,
  getMyProfile,
  getPatientById,
  addMedicalHistory,
} = require('../controllers/patient.controller')
const { protect } = require('../middleware/auth.middleware')

// Protected routes — need valid JWT
router.post('/profile', protect, createProfile)
router.get('/profile/me', protect, getMyProfile)
router.post('/medical-history', protect, addMedicalHistory)

// Internal route — called by other services, no JWT needed
// In production: protect with an internal API key
router.get('/internal/:id', getPatientById)

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'patient-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
})

module.exports = router
