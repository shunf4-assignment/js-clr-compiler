const { State, CLRItemState }  = require("./states");
const { DFAInvalidError }  = require("../common/errors");
const { tagSpecialChars, tagSpecialChars2 } = require("../common/utils");


class NFA {
  constructor(StateClass, obj) {
    this.name = "(Unnamed NFA)";
    this.alphabet = [];
    this.categories = {};
    this.catMap = {};
    this.enablesElse = false;
    this.states = {};
    this.initial = "";
    this.StateClass = StateClass;

    if (!(StateClass === State || StateClass.prototype instanceof State)) {
      throw new Error("!(StateClass.prototype instanceof State)");
    }

    if (obj) {
      this.name = obj.name;
      this.alphabet = obj.alphabet;
      this.categories = obj.categories;
      this.enablesElse = obj.enablesElse;
      this.states = obj.states;
      this.initial = obj.initial;
    }

    for (let catName in this.categories) {
      for (let letter of this.categories[catName]) {
        this.catMap[letter] = catName;
      }
    }
  }

  epsilonClosure(/** @type {Set} */stateSet) {
    let result = new Set(stateSet);

    let prevSize = result.size;
    
    for (;;) {
      for (let s of result) {
        if (s.delta[""]) {
          s.delta[""].forEach((sName) => {
            result.add(this.states[sName]);
          });
        }
      }

      if (result.size === prevSize)
        break;

      prevSize = result.size;
    }
   return result;
  }

  toString() {
    let str = "";
    str += "========= FA 打印 =========" + "\n";
    str += `名称: ${this.name}` + "\n";
    str += `字母表: ${(this.enablesElse ? "([else]启用)" : "([else]禁用)")}` + "\n";
    for (let l of this.alphabet) {
      str += l;
      if (this.categories[str]) {
        str += " :";
        for (let realLetter of this.categories[str]) {
          str += " " + realLetter;
        }
        str += " \n";
      } else {
        str += ", ";
      }
    }

    if (this.alphabet.length)
      str = str.substring(0, str.length - 2);
    
    str += `\n\n共有 ${Object.keys(this.states).length} 个状态\n`;

    for (let sName in this.states) {
      let s = this.states[sName];
      str += (this.initial === sName ? "[初始]" : "") + "状态 " + tagSpecialChars2(sName) + " : " + (s.accept ? "接受" : "非接受" ) + ". 转移函数:\n";

      for (let letter in s.delta) {
        str += "\t" +  (letter === "" ? "ε" : letter) + " -> ";
        for (let dest of s.delta[letter]) {
          str += tagSpecialChars2(dest) + ";"
        }
        str += "\n";
      }

      str += "\n";
    }

    str += "是否通过检测?\n";
    try {
      this.validate();
      str += "是\n";
    } catch (e) {
      if (e instanceof DFAInvalidError) {
        str += "否\n";
      } else {
        throw e;
      }
    }

    return str;
  }

  validate() {
  }

}

module.exports.NFA = NFA;