const { getChannel, EXCHANGE_NAME } = require('../config/rabbitmq')
const Bill   = require('../models/bill.model')
const logger = require('../config/logger')

const QUEUE_NAME = 'billing_queue'

const startConsumer = async () => {
  try {
    const channel = getChannel()

    await channel.assertQueue(QUEUE_NAME, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'medicore_dead_letters',
        'x-max-retries': 3,
      },
    })

    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, '')
    channel.prefetch(1)

    logger.info('Billing consumer started — waiting for events')

    channel.consume(QUEUE_NAME, async (message) => {
      if (!message) return

      let event
      try {
        event = JSON.parse(message.content.toString())

        const { correlationId, eventId, eventType, data } = event

        logger.info('Event received from RabbitMQ', {
          correlationId,
          eventId,
          eventType,
        })

        if (eventType === 'appointment.completed') {
          await handleAppointmentCompleted(data, eventId, correlationId)
        }

        channel.ack(message)

        logger.info('Event processed and acknowledged', {
          correlationId,
          eventId,
        })
      } catch (error) {
        logger.error('Failed to process RabbitMQ message', {
          correlationId: event?.correlationId,
          eventId:       event?.eventId,
          error:         error.message,
          stack:         error.stack,
        })
        channel.nack(message, false, false)
      }
    })
  } catch (error) {
    logger.error('Consumer setup failed — retrying in 5s', { error: error.message })
    setTimeout(startConsumer, 5000)
  }
}

const handleAppointmentCompleted = async (data, eventId, correlationId) => {
  const existingBill = await Bill.findOne({ appointmentId: data.appointmentId })

  if (existingBill) {
    logger.warn('Duplicate event — bill already exists', {
      correlationId,
      appointmentId: data.appointmentId,
    })
    return
  }

  const gst         = Math.round(data.consultationFee * 0.18)
  const totalAmount = data.consultationFee + gst

  const bill = await Bill.create({
    appointmentId:        data.appointmentId,
    patientId:            data.patientId,
    patientName:          data.patientName,
    doctorId:             data.doctorId,
    doctorName:           data.doctorName,
    doctorSpecialization: data.doctorSpecialization,
    consultationFee:      data.consultationFee,
    taxes:                { gst },
    totalAmount,
    appointmentDate:      data.date,
    timeSlot:             data.timeSlot,
    notes:                data.notes,
    paymentStatus:        'pending',
    sourceEventId:        eventId,
  })

  logger.info('Bill generated automatically', {
    correlationId,
    billId:      bill._id,
    patientName: data.patientName,
    doctorName:  data.doctorName,
    totalAmount,
  })

  return bill
}

module.exports = { startConsumer }
