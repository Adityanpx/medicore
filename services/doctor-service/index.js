require('dotenv').config()
const express  = require('express')
const cors     = require('cors')
const connectDB = require('./src/config/db')
const doctorRoutes = require('./src/routes/doctor.routes')

const app  = express()
const PORT = process.env.PORT || 4003

app.use(cors())
app.use(express.json())
app.use('/api/doctors', doctorRoutes)

app.get('/', (req, res) => {
  res.json({ service: 'doctor-service', status: 'running' })
})

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Doctor Service running on port ${PORT}`))
})
