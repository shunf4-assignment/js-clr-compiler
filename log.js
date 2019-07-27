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
var myColors = {
  emerg: 'red',
  alert: 'yellow',
  crit: 'red',
  error: 'red',
  warn: 'red',
  notice: 'yellow',
  info: 'green',
  debug: 'blue'
};

tripleBeam.configs.npm.levels = myLevels;
tripleBeam.configs.npm.colors = myColors;
const winston = require('winston');

function myInit({consoleLevel, debugFilePath, debugLevel, exceptionFilePath, exceptionLevel}) {
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
    filename: debugFilePath,
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
    filename: exceptionFilePath,
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