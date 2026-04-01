const User = require('../models/user.model')
const jwt = require('jsonwebtoken')
const logger = require('../config/logger')

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

const register = async (req, res) => {
  const { correlationId } = req

  logger.info('Register request received', {
    correlationId,
    email: req.body.email,
    role: req.body.role,
  })

  try {
    const { name, email, password, role } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      logger.warn('Registration failed — email already exists', {
        correlationId,
        email,
      })
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      })
    }

    const user = await User.create({ name, email, password, role })
    const token = generateToken(user._id, user.role)

    logger.info('User registered successfully', {
      correlationId,
      userId: user._id,
      email: user.email,
      role: user.role,
    })

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    })
  } catch (error) {
    logger.error('Registration failed with error', {
      correlationId,
      error: error.message,
      stack: error.stack,
    })
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    })
  }
}

const login = async (req, res) => {
  const { correlationId } = req

  logger.info('Login attempt', { correlationId, email: req.body.email })

  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      logger.warn('Login failed — user not found', { correlationId, email })
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      logger.warn('Login failed — wrong password', { correlationId, email })
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    const token = generateToken(user._id, user.role)

    logger.info('Login successful', {
      correlationId,
      userId: user._id,
      email: user.email,
      role: user.role,
    })

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        serviceId: user.serviceId,
      },
    })
  } catch (error) {
    logger.error('Login failed with error', {
      correlationId,
      error: error.message,
    })
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    })
  }
}

const verifyToken = async (req, res) => {
  const { correlationId } = req

  logger.debug('Token verification request', { correlationId })

  try {
    const { token } = req.body
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select('-password')

    if (!user) {
      logger.warn('Token valid but user not found', {
        correlationId,
        userId: decoded.userId,
      })
      return res.status(401).json({ success: false, message: 'User no longer exists' })
    }

    logger.debug('Token verified successfully', {
      correlationId,
      userId: user._id,
      role: user.role,
    })

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        serviceId: user.serviceId,
      },
    })
  } catch (error) {
    logger.warn('Token verification failed', {
      correlationId,
      error: error.message,
    })
    res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}

const updateServiceId = async (req, res) => {
  const { correlationId } = req
  const { userId, serviceId } = req.body

  logger.info('Updating serviceId', { correlationId, userId, serviceId })

  try {
    await User.findByIdAndUpdate(userId, { serviceId })
    logger.info('ServiceId updated', { correlationId, userId, serviceId })
    res.status(200).json({ success: true, message: 'ServiceId updated successfully' })
  } catch (error) {
    logger.error('Failed to update serviceId', {
      correlationId,
      error: error.message,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to update serviceId',
      error: error.message,
    })
  }
}

module.exports = { register, login, verifyToken, updateServiceId }
