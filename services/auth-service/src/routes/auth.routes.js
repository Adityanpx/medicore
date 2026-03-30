const express = require('express')
const router = express.Router()
const {
  register,
  login,
  verifyToken,
  updateServiceId,
} = require('../controllers/auth.controller')
const { protect } = require('../middleware/auth.middleware')

// Public routes
router.post('/register', register)
router.post('/login', login)

// Internal route — called by other services to verify tokens
router.post('/verify-token', verifyToken)

// Internal route — called by patient/doctor service after creating profile
router.patch('/update-service-id', protect, updateServiceId)

// Health check — every service must have this
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'auth-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
})

module.exports = router
