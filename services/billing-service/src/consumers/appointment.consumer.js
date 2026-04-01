const { getChannel, EXCHANGE_NAME } = require('../config/rabbitmq')
const Bill = require('../models/bill.model')

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

    console.log('Billing Service: Waiting for events...')

    channel.consume(QUEUE_NAME, async (message) => {
      if (!message) return

      try {
        const event = JSON.parse(message.content.toString())
        console.log(`Billing Service received event: ${event.eventType}`, {
          eventId: event.eventId,
        })

        if (event.eventType === 'appointment.completed') {
          await handleAppointmentCompleted(event.data, event.eventId)
        }

        channel.ack(message)
        console.log(`Event processed successfully: ${event.eventId}`)
      } catch (error) {
        console.error('Failed to process message:', error.message)
        channel.nack(message, false, false)
      }
    })
  } catch (error) {
    console.error('Consumer setup failed:', error.message)
    setTimeout(startConsumer, 5000)
  }
}

const handleAppointmentCompleted = async (data, eventId) => {
  const existingBill = await Bill.findOne({
    appointmentId: data.appointmentId,
  })

  if (existingBill) {
    console.log(`Bill already exists for appointment ${data.appointmentId} — skipping`)
    return
  }

  const gst = Math.round(data.consultationFee * 0.18)
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

  console.log(`Bill generated automatically: ₹${totalAmount} for ${data.patientName}`)
  return bill
}

module.exports = { startConsumer }
