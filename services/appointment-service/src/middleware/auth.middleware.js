const logger = require('../config/logger')
const { authBreaker } = require('../config/circuitBreakers')

const protect = async (req, res, next) => {
  const { correlationId } = req

  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]

    const result = await authBreaker.fire(token, correlationId)

    if (!result || result.circuitOpen) {
      logger.warn('Auth circuit open — request rejected at appointment-service', {
        correlationId,
      })
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
    logger.error('Auth middleware failed', { correlationId, error: error.message })
    res.status(401).json({ success: false, message: 'Authentication failed' })
  }
}

module.exports = { protect }
