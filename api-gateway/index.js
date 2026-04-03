require('dotenv').config()
const express    = require('express')
const cors       = require('cors')
const { createProxyMiddleware } = require('http-proxy-middleware')
const logger     = require('./logger')
const httpLogger = require('./httpLogger')
const correlationIdMiddleware = require('./correlationId.middleware')

const app  = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(correlationIdMiddleware)
app.use(httpLogger)

// Log every request that enters the gateway
app.use((req, res, next) => {
  logger.info('Gateway received request', {
    correlationId: req.correlationId,
    method: req.method,
    path:   req.path,
    ip:     req.ip,
  })
  next()
})

// Gateway health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'api-gateway',
    status:  'healthy',
    timestamp: new Date().toISOString(),
  })
})

// Helper to create proxy with full path preservation
const createServiceProxy = (prefix, target) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req, res) => {
        // Restore full original path since Express strips the prefix
        proxyReq.path = req.originalUrl
        // Forward correlationId to downstream service
        proxyReq.setHeader('x-correlation-id', req.correlationId)
      },
      error: (err, req, res) => {
        logger.error('Proxy error — service unavailable', {
          correlationId: req.correlationId,
          service: prefix,
          target,
          error: err.message,
        })
        res.status(503).json({
          success: false,
          message: `${prefix} service is currently unavailable`,
          correlationId: req.correlationId,
        })
      },
    },
  })
}

app.use('/api/auth',         createServiceProxy('Auth',        process.env.AUTH_SERVICE_URL))
app.use('/api/patients',     createServiceProxy('Patient',     process.env.PATIENT_SERVICE_URL))
app.use('/api/doctors',      createServiceProxy('Doctor',      process.env.DOCTOR_SERVICE_URL))
app.use('/api/appointments', createServiceProxy('Appointment', process.env.APPOINTMENT_SERVICE_URL))
app.use('/api/billing',      createServiceProxy('Billing',     process.env.BILLING_SERVICE_URL))

// Circuit breaker status endpoint
app.get('/circuit-status', async (req, res) => {
  const axios = require('axios')

  const services = [
    { name: 'auth-service',        url: process.env.AUTH_SERVICE_URL },
    { name: 'patient-service',     url: process.env.PATIENT_SERVICE_URL },
    { name: 'doctor-service',      url: process.env.DOCTOR_SERVICE_URL },
    { name: 'appointment-service', url: process.env.APPOINTMENT_SERVICE_URL },
    { name: 'billing-service',     url: process.env.BILLING_SERVICE_URL },
  ]

  const statusChecks = await Promise.allSettled(
    services.map(async (service) => {
      const start = Date.now()
      try {
        await axios.get(`${service.url}/health`, { timeout: 3000 })
        return {
          service: service.name,
          status: 'healthy',
          responseTime: `${Date.now() - start}ms`,
        }
      } catch (error) {
        return {
          service: service.name,
          status: 'unhealthy',
          responseTime: `${Date.now() - start}ms`,
          error: error.message,
        }
      }
    })
  )

  const results = statusChecks.map(r => r.value || r.reason)
  const allHealthy = results.every(r => r.status === 'healthy')

  res.status(allHealthy ? 200 : 207).json({
    success: allHealthy,
    timestamp: new Date().toISOString(),
    services: results,
  })
})

app.listen(PORT, () => {
  logger.info('API Gateway started', { port: PORT })
  logger.info('Routing configured', {
    auth:         process.env.AUTH_SERVICE_URL,
    patient:      process.env.PATIENT_SERVICE_URL,
    doctor:       process.env.DOCTOR_SERVICE_URL,
    appointment:  process.env.APPOINTMENT_SERVICE_URL,
    billing:      process.env.BILLING_SERVICE_URL,
  })
})
