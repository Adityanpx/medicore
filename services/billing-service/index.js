require('dotenv').config()
const express   = require('express')
const cors      = require('cors')
const connectDB = require('./src/config/db')
const logger     = require('./src/config/logger')
const httpLogger = require('./src/config/httpLogger')
const correlationIdMiddleware = require('./src/middleware/correlationId.middleware')
const { connectRabbitMQ } = require('./src/config/rabbitmq')
const { startConsumer }   = require('./src/consumers/appointment.consumer')
const billingRoutes = require('./src/routes/billing.routes')

const app  = express()
const PORT = process.env.PORT || 4005

app.use(cors())
app.use(express.json())
app.use(correlationIdMiddleware)
app.use(httpLogger)
app.use('/api/billing', billingRoutes)

app.get('/', (req, res) => {
  res.json({ service: 'billing-service', status: 'running' })
})

const startServer = async () => {
  await connectDB()
  await connectRabbitMQ()
  await startConsumer()
  app.listen(PORT, () => {
    logger.info(`Billing Service started`, { port: PORT })
    logger.info(`Billing Service listening for RabbitMQ events...`)
  })
}

startServer()
