const CircuitBreaker = require('opossum')
const logger = require('./logger')

const defaultOptions = {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 3,
}

const createCircuitBreaker = (action, name, options = {}, fallback = null) => {
  const breaker = new CircuitBreaker(action, {
    ...defaultOptions,
    ...options,
  })

  breaker.on('open', () => {
    logger.warn(`Circuit breaker OPENED — ${name} is unavailable`, {
      service: name,
      state: 'OPEN',
    })
  })

  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker HALF-OPEN — testing ${name}`, {
      service: name,
      state: 'HALF-OPEN',
    })
  })

  breaker.on('close', () => {
    logger.info(`Circuit breaker CLOSED — ${name} is back online`, {
      service: name,
      state: 'CLOSED',
    })
  })

  breaker.on('fallback', (result) => {
    logger.warn(`Circuit breaker fallback triggered — ${name}`, {
      service: name,
      fallbackResult: result,
    })
  })

  breaker.on('timeout', () => {
    logger.warn(`Circuit breaker timeout — ${name} took too long`, {
      service: name,
      timeout: defaultOptions.timeout,
    })
  })

  breaker.on('reject', () => {
    logger.warn(`Circuit breaker rejected request — ${name} circuit is OPEN`, {
      service: name,
      state: 'OPEN',
    })
  })

  if (fallback) {
    breaker.fallback(fallback)
  }

  return breaker
}

module.exports = { createCircuitBreaker }
