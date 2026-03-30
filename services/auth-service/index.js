require('dotenv').config()
const express = require('express')
const cors = require('cors')
const connectDB = require('./src/config/db')
const authRoutes = require('./src/routes/auth.routes')

const app = express()
const PORT = process.env.PORT || 4001

// Middleware
app.use(cors())
app.use(express.json())

// Routes
// Notice the prefix: /api/auth
// Every route in this service starts with /api/auth
app.use('/api/auth', authRoutes)

// Root health check
app.get('/', (req, res) => {
  res.json({ service: 'auth-service', status: 'running' })
})

// Connect to DB then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`)
  })
})
