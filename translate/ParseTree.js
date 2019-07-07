const { Symbol } = require("../common/Token");

class ParseTree {
  constructor() {
    this.root = null;
  }

  toString() {
    if (!this.root) {
      return "(Empty)";
    }

    return this.root.toString();
  }
}

class ParseTreeNode {
  constructor (/** @type {Symbol} */symbol) {
    this.symbol = symbol;
    this.children = [];
  }

  toString(levelEnds, level) {
    if (levelEnds === undefined) {
      levelEnds = [];
    }

    if (level === undefined) {
      level = levelEnds.length;
    }

    let result = "";

    let nodePrefix = levelEnds.map((v, i) => i === level - 1 ? "+---" : v ? "    " : "|   ").join("");

    result += nodePrefix + this.symbol.toLongString() + "\n";

    levelEnds.push(true);

    for (let i = 0; i < this.children.length; i++) {
      levelEnds[levelEnds.length - 1] = i === this.children.length - 1;
      result += this.children[i].toString(levelEnds);
    }
    
    levelEnds.pop();

    return result;
  }

}

module.exports.ParseTree = ParseTree;
module.exports.ParseTreeNode = ParseTreeNode;