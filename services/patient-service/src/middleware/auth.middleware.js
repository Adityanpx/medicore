const axios  = require('axios')
const logger = require('../config/logger')
const { createCircuitBreaker } = require('../config/circuitBreaker')

const verifyTokenRequest = async (token, correlationId) => {
  const response = await axios.post(
    `${process.env.AUTH_SERVICE_URL}/api/auth/verify-token`,
    { token },
    {
      headers: { 'x-correlation-id': correlationId },
      timeout: 5000,
    }
  )
  return response.data
}

const authCircuitBreaker = createCircuitBreaker(
  verifyTokenRequest,
  'auth-service',
  {},
  () => ({
    success: false,
    circuitOpen: true,
    message: 'Authentication service temporarily unavailable',
  })
)

const protect = async (req, res, next) => {
  const { correlationId } = req

  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]

    const result = await authCircuitBreaker.fire(token, correlationId)

    if (result.circuitOpen) {
      logger.warn('Auth circuit breaker is open — rejecting request', { correlationId })
      return res.status(503).json({
        success: false,
        message: 'Authentication service temporarily unavailable. Please try again shortly.',
        retryAfter: '30 seconds',
      })
    }

    if (!result.success) {
      return res.status(401).json({ success: false, message: 'Invalid token' })
    }

    req.user = result.user
    next()
  } catch (error) {
    logger.error('Auth middleware error', { correlationId, error: error.message })
    res.status(401).json({ success: false, message: 'Authentication failed' })
  }
}

module.exports = { protect, authCircuitBreaker }
