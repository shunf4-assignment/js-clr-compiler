const logger = require("winston");
const { Grammar } = require("./grammar/Grammar");

class CLRItem {
  constructor(prod, dotPos, lookAhead) {
    this.production = prod ? prod : null;
    this.dotPosition = dotPos !== undefined && dotPos !== null ? dotPos : null;
    this.lookAhead = lookAhead !== undefined && lookAhead !== null ? lookAhead : null;
  }

  toString() {
    let result = "";
    let prod = this.production;
    for (let pair of prod.left) {
      result += pair[UniqueName];
      result += " ";
    }
    result += "→";
    let ind = 0;
    for (let pair of prod.right) {
      if (this.dotPosition === ind) {
        if (ind === 0)
          result += " ";
        result += "·";
      } else {
        result += " ";
      }
      result += pair[UniqueName];
      ind++;
    }
    if (prod.right.length === 0) {
      result += " ·ε";
    } else if (prod.right.length === this.dotPosition) {
      result += "·";
    }

    result += " (";
    result += this.lookAhead;
    result += ")";

    return result;
  }

  isReducing() {
    return this.dotPosition === this.production.right.length;
  }

  equalTo(b) {
    return this.production === b.production && this.dotPosition === b.dotPosition && this.lookAhead === b.lookAhead;
  }
  
}

module.exports.CLRItem = CLRItem;