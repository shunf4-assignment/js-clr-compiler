const {tagSpecialChars} = require("../common/utils");

class Symbol {
  constructor (type) {
    this.type = type;
  }

  toString() {
    return this.type;
  }

  valueOf() {
    return this.type;
  }

  toLongString() {
    return `[ ${tagSpecialChars(this.type)} ]`;
  }

  static get epsilon() {
    if (Symbol._epsilon) {
      return Symbol._epsilon;
    }

    Symbol._epsilon = new Symbol("");
    return Symbol._epsilon;
  }
}

class Token extends Symbol {
  constructor (options) {
    super(options.type);
    for (let prop in options) {
      this[prop] = options[prop]
    }
  }

  toString() {
    return this.type ? (this.type) : (this.category);
  }

  valueOf() {
    return this.type ? (this.type) : (this.category);
  }

  toLongString() {
    if (this.type === "")
      return `< ${tagSpecialChars(this.category)} "${tagSpecialChars(this.lexeme)}" >`;

    return `< ${tagSpecialChars(this.category)} ${tagSpecialChars(this.type)} "${tagSpecialChars(this.lexeme)}" >`;
  }
}

module.exports.Symbol = Symbol;
module.exports.Token = Token;