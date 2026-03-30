const mongoose = require('mongoose')

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log(`Appointment Service: MongoDB connected`)
  } catch (error) {
    console.error(`Appointment Service: MongoDB connection failed — ${error.message}`)
    process.exit(1)
  }
}

module.exports = connectDB
