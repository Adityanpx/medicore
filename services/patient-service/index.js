require('dotenv').config()
const express = require('express')
const cors = require('cors')
const connectDB = require('./src/config/db')
const patientRoutes = require('./src/routes/patient.routes')

const app = express()
const PORT = process.env.PORT || 4002

app.use(cors())
app.use(express.json())

app.use('/api/patients', patientRoutes)

app.get('/', (req, res) => {
  res.json({ service: 'patient-service', status: 'running' })
})

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Patient Service running on port ${PORT}`)
  })
})
