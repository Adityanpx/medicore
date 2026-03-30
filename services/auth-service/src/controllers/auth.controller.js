const User = require('../models/user.model')
const jwt = require('jsonwebtoken')

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// REGISTER
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      })
    }

    // Create user in auth database
    const user = await User.create({ name, email, password, role })

    // Generate token
    const token = generateToken(user._id, user.role)

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    })
  }
}

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    // Generate token
    const token = generateToken(user._id, user.role)

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
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    })
  }
}

// VERIFY TOKEN — called by other services to verify authentication
const verifyToken = async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Also fetch fresh user data
    const user = await User.findById(decoded.userId).select('-password')
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists',
      })
    }

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
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    })
  }
}

// UPDATE serviceId — called after patient/doctor profile is created
const updateServiceId = async (req, res) => {
  try {
    const { userId, serviceId } = req.body

    await User.findByIdAndUpdate(userId, { serviceId })

    res.status(200).json({
      success: true,
      message: 'ServiceId updated successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update serviceId',
      error: error.message,
    })
  }
}

module.exports = { register, login, verifyToken, updateServiceId }
