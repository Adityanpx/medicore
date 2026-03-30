const axios = require('axios')

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      })
    }

    const token = authHeader.split(' ')[1]

    // Ask auth-service to verify this token
    // This is synchronous inter-service communication
    const response = await axios.post(
      `${process.env.AUTH_SERVICE_URL}/api/auth/verify-token`,
      { token }
    )

    if (!response.data.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      })
    }

    // Attach user data to request for use in controllers
    req.user = response.data.user
    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
    })
  }
}

module.exports = { protect }
