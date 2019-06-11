const {tagSpecialChars} = require("../common/utils");

class Token {
  constructor (options) {
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
      return `<${this.category} "${tagSpecialChars(this.lexeme)}">`;

    return `<${this.category} ${this.type} "${tagSpecialChars(this.lexeme)}">`;
  }
}

module.exports.Token = Token;