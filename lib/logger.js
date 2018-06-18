const winston = require('winston')

const isTest = process.env.npm_lifecycle_event === 'test'

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      level: isTest ? 'error' : 'info'
    })

    // new (winston.transports.File)({
    //     filename: 'somefile.log',
    //     level: 'info'
    // })
  ]
})

module.exports = logger
