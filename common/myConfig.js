module.exports = {
  sourceFileName: "testsource1.txt",
  asGBKInsteadOfUtf8: true,

  lexerConfig: "lex/lex-c-style.yaml",
  translatorConfig: "translate/grammar-c-style.yaml",

  consoleLevel: "notice",
  debugFileName: "debug.log",
  debugLevel: "info",
  exceptionFileName: "exception.log",
  exceptionLevel: "error",
  askIfConflict: true,
  forceOverwrite: true,

  dfaLog: false,
  debug: false,
};