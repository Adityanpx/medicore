const { getChannel, EXCHANGE_NAME } = require('./rabbitmq')
const logger = require('./logger')

const publishEvent = (eventType, data, correlationId) => {
  try {
    const channel = getChannel()

    const message = {
      eventType,
      data,
      correlationId,
      timestamp: new Date().toISOString(),
      eventId: Math.random().toString(36).substring(2, 15),
    }

    const messageBuffer = Buffer.from(JSON.stringify(message))

    channel.publish(EXCHANGE_NAME, '', messageBuffer, {
      persistent: true,
      contentType: 'application/json',
    })

    logger.info('Event published to RabbitMQ', {
      correlationId,
      eventType,
      eventId: message.eventId,
    })
  } catch (error) {
    logger.error('Failed to publish event', {
      correlationId,
      eventType,
      error: error.message,
    })
  }
}

module.exports = { publishEvent }
