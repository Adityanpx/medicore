require('dotenv').config()
const express  = require('express')
const cors     = require('cors')
const connectDB = require('./src/config/db')
const appointmentRoutes = require('./src/routes/appointment.routes')

const app  = express()
const PORT = process.env.PORT || 4004

app.use(cors())
app.use(express.json())
app.use('/api/appointments', appointmentRoutes)

app.get('/', (req, res) => {
  res.json({ service: 'appointment-service', status: 'running' })
})

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Appointment Service running on port ${PORT}`))
})
