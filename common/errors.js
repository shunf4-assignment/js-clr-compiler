class LexError extends Error {
  constructor (message) {
    super(message);
    this.name = "LexError(词法分析错误)";
  }
}

class DFAInvalidError extends Error {
  constructor (message) {
    super(message);
    this.name = "DFAInvalidError(DFA未通过验证)";
  }
}

class TranslateError extends Error {
  constructor (message) {
    super(message);
    this.name = "TranslateError(翻译错误)";
  }
}

class CodeGenerationError extends Error {
  constructor (message) {
    super(message);
    this.name = "CodeGenerationError(代码生成错误)";
  }
}

class IOEnd extends Error {
  constructor (message) {
    super(message);
    this.name = "IOEnd(流停止)";
  }
}

class NoMoreTokenError extends Error {
  constructor (message) {
    super(message);
    this.name = "NoMoreTokenError(没有更多Token了)";
  }
}

module.exports.LexError = LexError;
module.exports.DFAInvalidError = DFAInvalidError;
module.exports.TranslateError = TranslateError;
module.exports.IOEnd = IOEnd;
module.exports.NoMoreTokenError = NoMoreTokenError;
module.exports.CodeGenerationError = CodeGenerationError;