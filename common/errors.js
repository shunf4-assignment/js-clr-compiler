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

class IOEnd extends Error {
  constructor (message) {
    super(message);
    this.name = "IOEnd(流停止)";
  }
}

class NoMoreTokenError extends Error {
  constructor (message) {
    super(message);
    this.name = "NoMoreTokenError(没有更多 Token 了)";
  }
}

module.exports.LexError = LexError;
module.exports.DFAInvalidError = DFAInvalidError;
module.exports.IOEnd = IOEnd;
module.exports.NoMoreTokenError = NoMoreTokenError;