const express = require('express')
const router  = express.Router()
const { getMyBills, getBillById, markAsPaid } = require('../controllers/billing.controller')
const { protect } = require('../middleware/auth.middleware')

router.get('/my',            protect, getMyBills)
router.get('/:billId',       protect, getBillById)
router.patch('/:billId/pay', protect, markAsPaid)

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'billing-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
})

module.exports = router
