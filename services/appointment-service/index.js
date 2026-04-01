require('dotenv').config()
const express   = require('express')
const cors      = require('cors')
const connectDB = require('./src/config/db')
const logger     = require('./src/config/logger')
const httpLogger = require('./src/config/httpLogger')
const correlationIdMiddleware = require('./src/middleware/correlationId.middleware')
const { connectRabbitMQ } = require('./src/config/rabbitmq')
const appointmentRoutes = require('./src/routes/appointment.routes')

const app  = express()
const PORT = process.env.PORT || 4004

app.use(cors())
app.use(express.json())
app.use(correlationIdMiddleware)
app.use(httpLogger)
app.use('/api/appointments', appointmentRoutes)

app.get('/', (req, res) => {
  res.json({ service: 'appointment-service', status: 'running' })
})

const startServer = async () => {
  await connectDB()
  await connectRabbitMQ()
  app.listen(PORT, () => {
    logger.info(`Appointment Service started`, { port: PORT })
  })
}

startServer()
