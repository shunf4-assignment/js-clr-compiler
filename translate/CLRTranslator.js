const logger = require("winston");
const { Symbol, Token } = require("../common/Token");
const { NoMoreTokenError } = require("../common/errors");
const { tagSpecialChars } = require("../common/utils");
const { ParseTree, ParseTreeNode } = require("./ParseTree");
const { CLRTable, actionTranslate } = require("./CLRTable");
const { Grammar } = require("./grammar/Grammar");
const { Lexer } = require("../lex/Lexer");

const { debug } = require("../common/myConfig");

const fs = require("fs");

var stackTop = function() {
  return this[this.length - 1];
}

class CLRTranslator {
  constructor(/** @type{Grammar} */grammar, /** @type{CLRTable} */clrTable, /** @type{Lexer} */lexer) {
    this.grammar = grammar;
    this.auxObj = grammar.auxObj;
    this.clrTable = clrTable;
    this.lexer = lexer;
  }

  reset() {
    this.tokenBuffer = [];

    this.stateStack = [];
    this.symbolStack = [];
    this.treeNodeStack = [];

    this.stateStack.top = stackTop;
    this.symbolStack.top = stackTop;
    this.treeNodeStack.top = stackTop;

    this.analysisSteps = []; 

    this.parseTree = new ParseTree();


    this.stateStack.push(this.clrTable.initialState);
    this.symbolStack.push(Symbol.epsilon);
    this.treeNodeStack.push(null);

    this.currAction = null;
  }

  set lexer(lexer) {
    this._lexer = lexer;
    this.reset();
  }

  get lexer() {
    return this._lexer;
  }

  _loadToken() {
    if (this.tokenBuffer.length === 0) {
      let token = null;
      try {
        token = this.lexer.getNextToken();
      } catch (e) {
        if (e instanceof NoMoreTokenError) {
          token = new Token({
            category: EOF
          });
        } else throw e;
      }

      this.tokenBuffer.push(token);
    }
  }

  _peekToken() {
    if (this.tokenBuffer.length === 0) {
      this._loadToken();
    }
    return this.tokenBuffer[0];
  }

  _takeToken() {
    if (this.tokenBuffer.length === 0) {
      this._loadToken();
    }
    return this.tokenBuffer.pop();
  } 
  
  recordStep() {
    let result;
    result = String(this.analysisSteps.length);
    result += "\t";

    for (let state of this.stateStack) {
      if (state === null) {
        result += "<End>|";
      } else {
        result += state.index + "|";
      }
    }

    if (this.stateStack.length) {
      result = result.substring(0, result.length - 1);
    }
    
    result += "\t";

    for (let symbol of this.symbolStack) {
      if (symbol === Symbol.epsilon) {
        result += "ε|";
      } else {
        result += tagSpecialChars(symbol.toString()) + "|";
      }
    }

    if (this.symbolStack.length) {
      result = result.substring(0, result.length - 1);
    }

    result += "\t";

    if (this.lexer)
      result += tagSpecialChars(this._peekToken().toString());
    else 
      result += "(N/A)";

    result += "\t";

    if (this.currAction) {
      result += actionTranslate[this.currAction.action];
      
      if (this.currAction.dest) {
        if (this.currAction.action === "SHIFT")
          result += " " + this.currAction.dest.index;
        else if (this.currAction.action === "REDUCE")
          result += " " + tagSpecialChars(this.currAction.dest.toString());
        else if (this.currAction.action === "GOTO")
          result += "移入 " + tagSpecialChars(this.currAction.dest.prod.left[0][UniqueName].toString()) + " 并跳转 " + this.currAction.dest.state.index;
      }
    } else 
      result += "(N/A)";

    this.analysisSteps.push(result);
  }

  analyze() {
    let ACTION = this.clrTable.ACTION;
    let GOTO = this.clrTable.GOTO;
    let stateStack = this.stateStack;
    let symbolStack = this.symbolStack;
    let treeNodeStack = this.treeNodeStack;

    let actionObj = {
      symbols: null,
      auxObj: this.auxObj,
      lrStack: symbolStack
    };

    let err = null;

    let doAnalyze = () => {
      for (;;) {

        let peekToken = this._peekToken();
        if (!ACTION[stateStack.top().name] || !ACTION[stateStack.top().name][peekToken.toString()]) {
          throw new TranslateError(`ACTION[${stateStack.top().index}, ${tagSpecialChars(peekToken.toString())}] 不存在. 输入的符号串不符合语法.`);
        }

        let {action, dest} = this.currAction = ACTION[stateStack.top().name][peekToken.toString()];

        this.recordStep();
        if (action === "SHIFT") {
          stateStack.push(dest);
          symbolStack.push(this._takeToken());
          treeNodeStack.push(new ParseTreeNode(peekToken));
        } else {
          // REDUCE
          let prod = dest;
          let nonTerm = dest.left[0][UniqueName];
          let nonTermSymbol = new Symbol(nonTerm);
          let newNode = new ParseTreeNode(nonTermSymbol);

          let actionSymbols = {};
          if (prod.left[0].length >= 2)
            actionSymbols[prod.left[0][Abbrev]] = nonTermSymbol;

          let prodRightLen = prod.right.length;

          for (let i = 0; i < prod.right.length; i++) {
            let rightPair = prod.right[i];
            newNode.children.unshift(treeNodeStack.pop());
            stateStack.pop();
            let currSym = symbolStack.splice(symbolStack.length - prodRightLen + i, 1)[0];

            if (rightPair.length >= 2) {
              if (actionSymbols[rightPair[Abbrev]]) {
                throw new TranslateError(`文法缩略词存在重复: ${rightPair[Abbrev]}`);
              }
              actionSymbols[rightPair[Abbrev]] = currSym;
            }
          }

          // 执行文法动作
          actionObj.symbols = actionSymbols;
          prod.action(actionObj);

          if (!GOTO[stateStack.top().name]) {
            throw new TranslateError(`GOTO[${stateStack.top().index}, ...] 不存在. 输入的符号串不符合语法.`);
          }
        
          if (!GOTO[stateStack.top().name][nonTerm]) {
            if (peekToken.toString() === EOF && stateStack.length === 1 && nonTerm === this.grammar.startSymbol) {
              this.parseTree.root = newNode;
              stateStack.push(null);
              symbolStack.push(nonTermSymbol);
              treeNodeStack.push(newNode);
              this.currAction = {
                action: "END"
              };
              this.recordStep();

              logger.notice(`归约到了起始非终结符, GOTO[${stateStack[stateStack.length - 2].index}, ${tagSpecialChars(nonTerm)}] 查询失败而正常退出.`);
              break;
            } else {
              throw new TranslateError(`GOTO[${stateStack.top().index}, ${tagSpecialChars(nonTerm)}] 不存在. 输入的符号串不符合语法.`);
            }
          }

          // else
          this.currAction = {
            action: "GOTO",
            dest: {state: GOTO[stateStack.top().name][nonTerm], prod: prod}
          };
          this.recordStep();

          this.parseTree.root = newNode;
          stateStack.push(GOTO[stateStack.top().name][nonTerm]);
          symbolStack.push(nonTermSymbol);
          treeNodeStack.push(newNode);

        }
      }

      logger.info("语法树如下:");
      logger.info("\n" + this.parseTree.toString());
      logger.notice("语法分析成功.");

      logger.notice("四元式序列如下: ");
      for (let i = 0; i < this.auxObj.quads.length; i++) {
        let quad = this.auxObj.quads[i];
        logger.notice(i + ".\t" + quad.toString());
      }

    }

    if (debug) {
      doAnalyze();
    } else {
      try {
        doAnalyze()
      } catch (e) {
        err = e;
      }
    }

    let utf16leBOM = Buffer.from([0xFF, 0xFE]);
    let fileName = "Analysis.csv";
    fs.writeFile(fileName, Buffer.concat([utf16leBOM, Buffer.from("序号\t状态栈\t符号栈\t下一词法单元\t动作\n", "utf16le"), Buffer.from(this.analysisSteps.join("\n"), "utf16le")]), function(err) {
      if (err) {
          logger.error(err);
      }
      logger.notice("分析过程已经写入 " + fileName + ", 请用 Microsoft Office Excel 打开.");
    });

    if (err) {
      throw err;
    }
  }

}

module.exports.CLRTranslator = CLRTranslator;