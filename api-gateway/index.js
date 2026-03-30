require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { createProxyMiddleware } = require('http-proxy-middleware')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())

// Simple logger — see every request that comes through the gateway
app.use((req, res, next) => {
  console.log(`[Gateway] ${req.method} ${req.path} → ${new Date().toISOString()}`)
  next()
})

// Gateway health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'api-gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
})

// Helper to create proxy with full path preservation
// Express strips the mount path from req.url, so we restore it from req.originalUrl
const createServiceProxy = (prefix, target) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req, res) => {
        // Restore full original path since Express strips the prefix
        proxyReq.path = req.originalUrl
      },
      error: (err, req, res) => {
        res.status(503).json({
          success: false,
          message: `${prefix} service unavailable`,
        })
      },
    },
  })
}

// Route: anything starting with /api/auth → auth-service
app.use('/api/auth', createServiceProxy('Auth', process.env.AUTH_SERVICE_URL))

// Route: anything starting with /api/patients → patient-service
app.use('/api/patients', createServiceProxy('Patient', process.env.PATIENT_SERVICE_URL))

// Route: anything starting with /api/doctors → doctor-service
app.use('/api/doctors', createServiceProxy('Doctor', process.env.DOCTOR_SERVICE_URL))

// Route: anything starting with /api/appointments → appointment-service
app.use('/api/appointments', createServiceProxy('Appointment', process.env.APPOINTMENT_SERVICE_URL))

// Route: anything starting with /api/billing → billing-service
app.use('/api/billing', createServiceProxy('Billing', process.env.BILLING_SERVICE_URL))

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`)
  console.log(`Routing:`)
  console.log(`  /api/auth        → ${process.env.AUTH_SERVICE_URL}`)
  console.log(`  /api/patients    → ${process.env.PATIENT_SERVICE_URL}`)
  console.log(`  /api/doctors     → ${process.env.DOCTOR_SERVICE_URL}`)
  console.log(`  /api/appointments→ ${process.env.APPOINTMENT_SERVICE_URL}`)
  console.log(`  /api/billing     → ${process.env.BILLING_SERVICE_URL}`)
})
