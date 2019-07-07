const logger = require("winston");
const readlineSync = require("readline-sync");
const {tagSpecialChars, tagSpecialChars2} = require("../common/utils");

const { askIfConflict, forceOverwrite } = require("../common/myConfig");

var actionTranslate = {
  "SHIFT": "移进",
  "REDUCE": "归约",
  "GOTO": "",
  "END": "终止"
};

class CLRTable {
  constructor() {
    this.terminals = [];
    this.nonTerminals = [];
    this.initialState = null;
    this.states = null;
    
    this.ACTION = {};
    this.GOTO = {};

  }

  addToACTION(fromStateName, terminal, action, dest) {
    if (!this.ACTION[fromStateName]) {
      this.ACTION[fromStateName] = {};
    }

    let willWrite = true;

    if (this.ACTION[fromStateName][terminal]) {
      let existingEntry = this.ACTION[fromStateName][terminal];

      let conflictStr = `ACTION[${tagSpecialChars2(fromStateName)}, ${terminal}]\n = ${actionTranslate[action]}:${dest.toString()} \n\n与原有 \n\nACTION[..., ...] = ${actionTranslate[existingEntry.action]}:${tagSpecialChars2(existingEntry.dest.toString())}\n\n 冲突, 该文法不是 LR(1) 的`;

      if (askIfConflict) {
        if (!forceOverwrite) {
          console.log(conflictStr + ". 覆盖吗?");
          let answer = readlineSync.question("(Y/N)");
          if (answer.toUpperCase === "Y") {
            willWrite = true;
          } else {
            willWrite = false;
          }
        } else {
          logger.warn("使用强制覆盖的方法解决了 ACTION 表内的一个冲突. 若要查看此冲突并手动解决, 请将 common/myConfig.js 中的 forceOverwrite 选项置为 false.");
        }
      } else throw new TranslateError(conflictStr);
    }

    if (willWrite)
      this.ACTION[fromStateName][terminal] = {
        action: action,
        dest: dest
      };
  }

  addToGOTO(fromStateName, nonTerm, destState) {
    if (!this.GOTO[fromStateName]) {
      this.GOTO[fromStateName] = {};
    }

    let willWrite = true;

    if (this.GOTO[fromStateName][nonTerm]) {
      let existingEntry = this.GOTO[fromStateName][nonTerm];
      let conflictStr = `GOTO[${tagSpecialChars2(fromStateName)}, ${nonTerm}]\n = ${destState.toString()} \n\n与原有\n\nGOTO[..., ...] = ${tagSpecialChars2(existingEntry.toString())} \n\n冲突, 该文法不是 LR(1) 的`;

      if (askIfConflict) {
        if (!forceOverwrite) {
          console.log(conflictStr + ". 覆盖吗?");
          let answer = readlineSync.question("(Y/N)");
          if (answer.toUpperCase === "Y") {
            willWrite = true;
          } else {
            willWrite = false;
          }
        } else {
          logger.warn("使用强制覆盖的方法解决了 ACTION 表内的一个冲突. 若要查看此冲突并手动解决, 请将 common/myConfig.js 中的 forceOverwrite 选项置为 false.");
        }
      } else throw new TranslateError(conflictStr);
    }

    if (willWrite)
      this.GOTO[fromStateName][nonTerm] = destState;
  }

  toString() {
    let result = "起始状态" + this.initialState.index;
    result += "\t" + "ACTION" + new Array(this.terminals.length + 1).join("\t") + "GOTO" + new Array(this.nonTerminals.length).join("\t") + "\n";
    
    for (let terminal of this.terminals) {
      result += "\t" + tagSpecialChars(terminal);
    }

    for (let nonTerm of this.nonTerminals) {
      result += "\t" + tagSpecialChars(nonTerm);
    }

    result += "\n";

    for (let state of Object.values(this.states)) {
      result += String(state.index);

      for (let terminal of this.terminals) {
        result += "\t";
        if (this.ACTION[state.name] && this.ACTION[state.name][terminal]) {
          result += actionTranslate[this.ACTION[state.name][terminal].action];
          if (this.ACTION[state.name][terminal].action === "SHIFT")
            result += this.ACTION[state.name][terminal].dest.index;  // state.index
          else
            result += this.ACTION[state.name][terminal].dest.index;  // prod.index
        }
      }
  
      for (let nonTerm of this.nonTerminals) {
        result += "\t";
        if (this.GOTO[state.name] && this.GOTO[state.name][nonTerm]) {
          result += this.GOTO[state.name][nonTerm].index;
        }
      }

      result += "\n";
    }

    return result;
  }

  static fromGrammarAndDFA(grammar, dfa) {
    let table = new CLRTable();

    table.initialState = dfa.states[dfa.initial];
    table.states = dfa.states;

    table.terminals = [...grammar.terminals];
    table.nonTerminals = [...grammar.nonTerminals];

    for (let state of Object.values(dfa.states)) {
      if (state.name === "_extraEmpty") {
        continue;
      }

      for (let sym of grammar.symbols) {
        if (!state.delta[sym] || state.delta[sym].length !== 1) {
          continue;
        }

        let nextState = dfa.states[state.delta[sym][0]];

        if (!nextState.clrItems || nextState.clrItems.size === 0) {
          continue;
        }

        if (grammar.terminals.has(sym)) {
          table.addToACTION(state.name, sym, "SHIFT", nextState);
        } else {
          table.addToGOTO(state.name, sym, nextState);
        }
      }

      for (let clrItem of state.clrItems) {
        if (clrItem.isReducing()) {
          table.addToACTION(state.name, clrItem.lookAhead, "REDUCE", clrItem.production);
        }
      }
    }

    return table;
      
  }
}

module.exports.actionTranslate = actionTranslate;
module.exports.CLRTable = CLRTable;