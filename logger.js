const winston = require('winston')
const path = require('path')

const format = [
  winston.format.errors({ stack: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
]

function createLogger(dir) {
  return winston.createLogger({
    transports: [
      new winston.transports.File({
        filename: path.resolve(dir, 'combined.log'),
        format: winston.format.combine(...format),
        level: 'info',
      }),
      new winston.transports.File({
        filename: path.resolve(dir, 'error.log'),
        format: winston.format.combine(...format),
        level: 'error',
      }),
      new winston.transports.Console({
        level: 'info',
        format: winston.format.combine(
          winston.format.colorize(),
          ...format
        ),
      })
    ]
  })
}

function createError(error) {
  if (error instanceof Error) {
    return `${error.message}\n${error.stack?.split('\n').slice(1).join('\n') || ''}`
  }
  else return error
}

module.exports = {
  createLogger,
  createError,
}