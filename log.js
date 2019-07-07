const tripleBeam = require("triple-beam");
var myLevels = { 
  emerg: 0, 
  alert: 1, 
  crit: 2, 
  error: 3, 
  warn: 4, 
  notice: 5, 
  info: 6, 
  debug: 7,
};
tripleBeam.configs.npm.levels = myLevels;
const winston = require('winston');

function myInit({consoleLevel, debugFileName, debugLevel, exceptionFileName, exceptionLevel}) {
  var debugConsole = new winston.transports.Console({
    level: consoleLevel,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message }) => {
        return `${level}: ${message}`;
      })
    )
  });
  var debugFile = new winston.transports.File({
    filename: debugFileName,
    level: debugLevel,
    options: { flags: 'w' },
    format: winston.format.combine(
      winston.format.printf(({ level, message }) => {
        return `${level}: ${message}`;
      })
    )
  });
  var exceptionConsole = new winston.transports.Console({
    level: exceptionLevel,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message }) => {
        return `${level}: ${message}`;
      })
    ),
    handleExceptions: true
  });
  var exceptionFile = new winston.transports.File({
    filename: exceptionFileName,
    level: exceptionLevel,
    options: { flags: 'w' },
    format: winston.format.combine(
      winston.format.printf(({ level, message }) => {
        return `${level}: ${message}`;
      })
    ),
    handleExceptions: true
  });

  winston.configure({
    levels: myLevels,
    transports: [
      debugConsole,
      debugFile,
      exceptionConsole,
      exceptionFile
    ],
  });
}

module.exports = winston;
module.exports.myInit = myInit;