const winston = require('winston')

const isTest = process.env.npm_lifecycle_event === 'test'

const logger = winston.createLogger({
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console({
      level: isTest ? 'error' : 'info'
    })
  ]
})

module.exports = logger
