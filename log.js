const winston = require('winston');

var debugConsole = new winston.transports.Console({level: 'notice'});
var debugFile = new winston.transports.File({filename: 'debug.log', level: 'debug', options: { flags: 'w' }});
var exceptionConsole = new winston.transports.Console({level: 'info'});
var exceptionFile = new winston.transports.File({filename: 'exception.log', level: 'debug', options: { flags: 'w' }});


winston.configure({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ level, message }) => {
      return `${level}: ${message}`;
    })
  ),
  levels: { 
    emerg: 0, 
    alert: 1, 
    crit: 2, 
    error: 3, 
    warning: 4, 
    notice: 5, 
    info: 6, 
    debug: 7,
  },
  transports: [
    debugConsole,
    debugFile,
  ],
  handleExceptions: true,
  exceptionHandlers: [
    exceptionConsole,
    exceptionFile
  ]
});

module.exports = winston;