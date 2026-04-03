const axios  = require('axios')
const { createCircuitBreaker } = require('./circuitBreaker')

// ─── Auth Service Circuit Breaker ─────────────────────────────────
const verifyTokenRequest = async (token, correlationId) => {
  const response = await axios.post(
    `${process.env.AUTH_SERVICE_URL}/api/auth/verify-token`,
    { token },
    { headers: { 'x-correlation-id': correlationId }, timeout: 5000 }
  )
  return response.data
}

const authBreaker = createCircuitBreaker(
  verifyTokenRequest,
  'auth-service',
  {},
  () => ({ success: false, circuitOpen: true, message: 'Auth service unavailable' })
)

// ─── Patient Service Circuit Breaker ──────────────────────────────
const fetchPatientRequest = async (patientId, correlationId) => {
  const response = await axios.get(
    `${process.env.PATIENT_SERVICE_URL}/api/patients/internal/${patientId}`,
    { headers: { 'x-correlation-id': correlationId }, timeout: 5000 }
  )
  return response.data
}

const patientBreaker = createCircuitBreaker(
  fetchPatientRequest,
  'patient-service',
  {},
  () => null
)

// ─── Doctor Service Circuit Breaker ───────────────────────────────
const fetchDoctorRequest = async (doctorId, correlationId) => {
  const response = await axios.get(
    `${process.env.DOCTOR_SERVICE_URL}/api/doctors/internal/${doctorId}`,
    { headers: { 'x-correlation-id': correlationId }, timeout: 5000 }
  )
  return response.data
}

const doctorBreaker = createCircuitBreaker(
  fetchDoctorRequest,
  'doctor-service',
  {},
  () => null
)

// ─── Doctor Availability Circuit Breaker ──────────────────────────
const checkAvailabilityRequest = async (doctorId, day, correlationId) => {
  const response = await axios.get(
    `${process.env.DOCTOR_SERVICE_URL}/api/doctors/internal/availability`,
    {
      params: { doctorId, day },
      headers: { 'x-correlation-id': correlationId },
      timeout: 5000,
    }
  )
  return response.data
}

const availabilityBreaker = createCircuitBreaker(
  checkAvailabilityRequest,
  'doctor-availability',
  {},
  () => ({ isAvailable: false, circuitOpen: true })
)

module.exports = { authBreaker, patientBreaker, doctorBreaker, availabilityBreaker }
