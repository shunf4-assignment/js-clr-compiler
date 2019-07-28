module.exports = {
  sourceFileName: "test_sources/testsource1.c",
  asGBKInsteadOfUtf8: true,

  lexerConfig: "lex/lex-c-style.yaml",
  translatorConfig: "translate/grammar-c-style.yaml",

  consoleLevel: "notice",
  debugFilePath: "logs/debug.log",
  outputFilePath: "output/output.txt",
  asmPath: "output/output.asm",
  debugLevel: "info",
  exceptionFilePath: "logs/exception.log",
  exceptionLevel: "error",
  askIfConflict: true,
  forceOverwrite: true,

  dfaLog: false,
  debug: false,
};