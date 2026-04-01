const Bill = require('../models/bill.model')
const logger = require('../config/logger')

const getMyBills = async (req, res) => {
  const { correlationId } = req
  const patientId = req.user.serviceId

  logger.debug('Fetching patient bills', { correlationId, patientId })

  try {
    const bills = await Bill.find({ patientId }).sort({ createdAt: -1 })

    logger.info('Patient bills fetched', { correlationId, patientId, count: bills.length })
    res.status(200).json({ success: true, count: bills.length, bills })
  } catch (error) {
    logger.error('Failed to fetch patient bills', { correlationId, error: error.message })
    res.status(500).json({ success: false, message: 'Failed to fetch bills', error: error.message })
  }
}

const getBillById = async (req, res) => {
  const { correlationId } = req
  const { billId } = req.params

  logger.debug('Fetching bill by ID', { correlationId, billId })

  try {
    const bill = await Bill.findById(billId)

    if (!bill) {
      logger.warn('Bill not found', { correlationId, billId })
      return res.status(404).json({ success: false, message: 'Bill not found' })
    }

    logger.debug('Bill fetched', { correlationId, billId })
    res.status(200).json({ success: true, bill })
  } catch (error) {
    logger.error('Failed to fetch bill', { correlationId, error: error.message })
    res.status(500).json({ success: false, message: 'Failed to fetch bill', error: error.message })
  }
}

const markAsPaid = async (req, res) => {
  const { correlationId } = req
  const { billId } = req.params

  logger.info('Mark bill as paid request', { correlationId, billId })

  try {
    const bill = await Bill.findByIdAndUpdate(
      billId,
      { paymentStatus: 'paid' },
      { new: true }
    )

    if (!bill) {
      logger.warn('Bill not found for payment', { correlationId, billId })
      return res.status(404).json({ success: false, message: 'Bill not found' })
    }

    logger.info('Bill marked as paid', { correlationId, billId, totalAmount: bill.totalAmount })
    res.status(200).json({ success: true, message: 'Bill marked as paid', bill })
  } catch (error) {
    logger.error('Failed to mark bill as paid', { correlationId, error: error.message })
    res.status(500).json({ success: false, message: 'Failed to update bill', error: error.message })
  }
}

module.exports = { getMyBills, getBillById, markAsPaid }
