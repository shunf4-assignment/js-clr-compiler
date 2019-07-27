module.exports = {
  sourceFileName: "test_sources/testsource1.txt",
  asGBKInsteadOfUtf8: true,

  lexerConfig: "lex/lex-c-style.yaml",
  translatorConfig: "translate/grammar-c-style.yaml",

  consoleLevel: "notice",
  debugFilePath: "logs/debug.log",
  debugLevel: "info",
  exceptionFilePath: "logs/exception.log",
  exceptionLevel: "error",
  askIfConflict: true,
  forceOverwrite: true,

  dfaLog: false,
  debug: false,
};