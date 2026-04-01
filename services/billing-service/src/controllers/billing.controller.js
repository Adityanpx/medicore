const Bill = require('../models/bill.model')

const getMyBills = async (req, res) => {
  try {
    const bills = await Bill.find({ patientId: req.user.serviceId })
      .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      count: bills.length,
      bills,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bills',
      error: error.message,
    })
  }
}

const getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.billId)

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' })
    }

    res.status(200).json({ success: true, bill })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill',
      error: error.message,
    })
  }
}

const markAsPaid = async (req, res) => {
  try {
    const bill = await Bill.findByIdAndUpdate(
      req.params.billId,
      { paymentStatus: 'paid' },
      { new: true }
    )

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' })
    }

    res.status(200).json({
      success: true,
      message: 'Bill marked as paid',
      bill,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update bill',
      error: error.message,
    })
  }
}

module.exports = { getMyBills, getBillById, markAsPaid }
