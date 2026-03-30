const axios = require('axios')

// Exact same pattern as patient-service
// Doctor-service also calls auth-service to verify tokens
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    const response = await axios.post(
      `${process.env.AUTH_SERVICE_URL}/api/auth/verify-token`,
      { token }
    )

    if (!response.data.success) {
      return res.status(401).json({ success: false, message: 'Invalid token' })
    }

    req.user = response.data.user
    next()
  } catch (error) {
    res.status(401).json({ success: false, message: 'Authentication failed' })
  }
}

// Only doctors can access certain routes
const doctorOnly = (req, res, next) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({
      success: false,
      message: 'Access denied — doctors only',
    })
  }
  next()
}

module.exports = { protect, doctorOnly }
