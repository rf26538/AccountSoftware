const winston = require('winston');

class Logger 
{
  static log()
  {
    return winston.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({
            filename: 'Combined.log',
            format: winston.format.combine(
              winston.format.timestamp('YYYY-MM-DD HH:mm:ss'),
              winston.format.splat(),
              // winston.format.simple(),
              winston.format.printf(({ level, message, timestamp }) => {
                return `${timestamp} ${level.toUpperCase()} Message: ${message}`;
              })
            ),
          })
      ],
      exceptionHandlers: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'Combined.log'})
      ]
    });
  }
}


module.exports = Logger.log();