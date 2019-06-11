const logger = require("winston");
const { TokenRecognizer } = require("./TokenRecognizer");
const { Lexer } = require("./Lexer");

class LexerGenerator {
  constructor(config) {
    if (!config)
      return;

    this.config = config;
  }

  set config(_config) {
    this.evalUtils = _config.utilFuncs;
    this.tokenRecognizers = _config.tokenRecognizers.map((obj) => new TokenRecognizer(obj));
    logger.info(["词法分析器生成器: 加载了配置: ", this.tokenRecognizers]);
  }

  generate() {
    return new Lexer(this.evalUtils, this.tokenRecognizers);
  }

}

module.exports.LexerGenerator = LexerGenerator;