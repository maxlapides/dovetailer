const winston = require('winston')

const logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            level: 'info'
        })

        // new (winston.transports.File)({
        //     filename: 'somefile.log',
        //     level: 'info'
        // })
    ]
})

module.exports = logger
