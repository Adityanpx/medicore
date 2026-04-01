require('dotenv').config()
const express    = require('express')
const cors       = require('cors')
const connectDB  = require('./src/config/db')
const logger     = require('./src/config/logger')
const httpLogger = require('./src/config/httpLogger')
const correlationIdMiddleware = require('./src/middleware/correlationId.middleware')
const authRoutes = require('./src/routes/auth.routes')

const app  = express()
const PORT = process.env.PORT || 4001

app.use(cors())
app.use(express.json())
app.use(correlationIdMiddleware)
app.use(httpLogger)

app.use('/api/auth', authRoutes)

app.get('/', (req, res) => {
  res.json({ service: 'auth-service', status: 'running' })
})

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`Auth Service started`, { port: PORT })
  })
})
