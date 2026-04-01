const amqp = require('amqplib')

let connection = null
let channel    = null

const EXCHANGE_NAME = 'medicore_events'

const connectRabbitMQ = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL)
    channel = await connection.createChannel()

    await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true })

    console.log('RabbitMQ connected successfully')
    return channel
  } catch (error) {
    console.error(`RabbitMQ connection failed — ${error.message}`)
    setTimeout(connectRabbitMQ, 5000)
  }
}

const getChannel = () => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized. Call connectRabbitMQ first.')
  }
  return channel
}

const closeRabbitMQ = async () => {
  try {
    await channel.close()
    await connection.close()
    console.log('RabbitMQ connection closed')
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error.message)
  }
}

module.exports = { connectRabbitMQ, getChannel, closeRabbitMQ, EXCHANGE_NAME }
