require('dotenv').config()
const express   = require('express')
const cors      = require('cors')
const connectDB = require('./src/config/db')
const { connectRabbitMQ } = require('./src/config/rabbitmq')
const { startConsumer }   = require('./src/consumers/appointment.consumer')
const billingRoutes = require('./src/routes/billing.routes')

const app  = express()
const PORT = process.env.PORT || 4005

app.use(cors())
app.use(express.json())
app.use('/api/billing', billingRoutes)

app.get('/', (req, res) => {
  res.json({ service: 'billing-service', status: 'running' })
})

const startServer = async () => {
  await connectDB()
  await connectRabbitMQ()
  await startConsumer()
  app.listen(PORT, () => {
    console.log(`Billing Service running on port ${PORT}`)
    console.log(`Billing Service listening for RabbitMQ events...`)
  })
}

startServer()
