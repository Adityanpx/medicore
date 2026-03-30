const mongoose = require('mongoose')

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log(`Doctor Service: MongoDB connected`)
  } catch (error) {
    console.error(`Doctor Service: MongoDB connection failed — ${error.message}`)
    process.exit(1)
  }
}

module.exports = connectDB
