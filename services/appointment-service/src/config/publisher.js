const { getChannel, EXCHANGE_NAME } = require('./rabbitmq')

const publishEvent = (eventType, data) => {
  try {
    const channel = getChannel()

    const message = {
      eventType,
      data,
      timestamp: new Date().toISOString(),
      eventId: Math.random().toString(36).substring(2, 15),
    }

    const messageBuffer = Buffer.from(JSON.stringify(message))

    channel.publish(EXCHANGE_NAME, '', messageBuffer, {
      persistent: true,
      contentType: 'application/json',
    })

    console.log(`Event published: ${eventType}`, { eventId: message.eventId })
  } catch (error) {
    console.error(`Failed to publish event: ${eventType}`, error.message)
  }
}

module.exports = { publishEvent }
