const logger = require("winston");
const { LexError, NoMoreTokenError, IOEnd } = require("../common/errors");
const { tagSpecialChars } = require("../common/utils");

class Lexer {
  constructor(evalUtils, tokenRecognizers) {
    this.evalUtils = evalUtils;
    this.tokenRecognizers = tokenRecognizers;
    this._getMoreChar = undefined;
    this.charBuffer = "";
    this.lexemeS = 0;
    this.lexemeE = 0;
  }

  reset() {
    this.charBuffer = "";
  }

  set getMoreChar(_getMoreChar) {
    this._getMoreChar = _getMoreChar;
    this.reset();
  }

  get getMoreChar() {
    return this._getMoreChar;
  }

  getNextChar() {
    while (this.charBuffer.length <= this.lexemeE) {
      this.charBuffer += this.getMoreChar();
    }

    return this.charBuffer[this.lexemeE++];
  }
  
  getNextToken() {
    var currChar;
    var ioEnd = false;
    var lastAcceptLexemeE = null;
    var lastAcceptTRs = null;

    var ret = null;

    while (ret === null) {

      for (let tr of this.tokenRecognizers) {
        tr.dfa.reset();
      }

      for (;;) {
      
        try {
          currChar = this.getNextChar();
        } catch (e) {
          if (e instanceof IOEnd) {
            ioEnd = true;
          } else throw e;
        }

        if (ioEnd) {
          if (this.lexemeE == 0 /* 当前 lexeme 串是空的 */) {
            throw new NoMoreTokenError();
          }

          let acceptingTR = null;
          if (this.tokenRecognizers.every((tr) => {
            if (tr.dfa.currState.accept) {
              if (acceptingTR === null)
                acceptingTR = tr;
              else
                throw new LexError(`从此处开始到源码末尾, 多个自动机均接受此词: ${this.charBuffer.substr(this.lemexeS)}`);
              return false;
            } else {
              return true;
            }
          })) {
            // 所有 DFA 都不处于接受状态
            throw new LexError(`从此处开始到源码末尾均无法识别一个词: ${tagSpecialChars(this.charBuffer.substr(this.lemexeS))}`);
          }

          ret = acceptingTR.evaluator({util: this.evalUtils, str: this.charBuffer.substring(this.lexemeS, this.lexemeE)});

          if (ret !== null) {
            logger.info(`识别字符串 ${ tagSpecialChars(this.charBuffer.substring(this.lexemeS, this.lexemeE)) } 为 Token : ${ret.toString()}, 此动作由 Token 识别器 ${acceptingTR.name} 完成`);
          } else {
            logger.info(`识别字符串 ${ tagSpecialChars(this.charBuffer.substring(this.lexemeS, this.lexemeE)) } 为空 Token, 此动作由 Token 识别器 ${acceptingTR.name} 完成`);
          }
          
          this.charBuffer = this.charBuffer.substr(this.lexemeE);
          this.lexemeS = 0;
          this.lexemeE = 0;

          break;
        }

        let anyAccept = false;
        let allTrapped = true;
        let currAcceptTRs = [];

        for (let tr of this.tokenRecognizers) {
          let prevStateName = tr.dfa.currStateName;

          tr.dfa.goOneStep(currChar);

          logger.info(`DFA ${tr.dfa.name} 从状态 ${prevStateName} 接受输入字母 ${tagSpecialChars(currChar)}, 跳转到 ${tr.dfa.currStateName} (${tr.dfa.currState.accept ? "接受" : "非接受"})`);

          if (tr.dfa.currState.accept) {
            anyAccept = true;
            currAcceptTRs.push(tr);
          }

          if (tr.dfa.currStateName !== "_empty" && tr.dfa.currStateName !== "_extraEmpty") {
            allTrapped = false;
          }
        }

        if (anyAccept) {
          lastAcceptLexemeE = this.lexemeE;
          lastAcceptTRs = currAcceptTRs;
        } else if (allTrapped) {
          if (lastAcceptLexemeE === null) {
            throw new LexError(`从此处开始无法识别为有效词(在最后一个字符识别失败): ${tagSpecialChars(this.charBuffer.substring(this.lexemeS, this.lexemeE))}`);
          }

          if (lastAcceptTRs.length !== 1) {
            throw new LexError(`此词被多个 DFA 识别为有效词: ${tagSpecialChars(this.charBuffer.substring(this.lexemeS, this.lexemeE))}`);
          }

          this.lexemeE = lastAcceptLexemeE;
      
          ret = lastAcceptTRs[0].evaluator({util: this.evalUtils, str: this.charBuffer.substring(this.lexemeS, this.lexemeE)});
          
          if (ret !== null)
            logger.info(`识别字符串 ${tagSpecialChars(this.charBuffer.substring(this.lexemeS, this.lexemeE))} 为 Token : ${ret.toString()}, 此动作由 Token 识别器 ${lastAcceptTRs[0].name} 完成`);
          else
            logger.info(`识别字符串 ${tagSpecialChars(this.charBuffer.substring(this.lexemeS, this.lexemeE))} 为空 Token, 此动作由 Token 识别器 ${lastAcceptTRs[0].name} 完成`);

          this.charBuffer = this.charBuffer.substr(this.lexemeE);
          this.lexemeS = 0;
          this.lexemeE = 0;

          break;
        }
      }
    }
    return ret;
  }
}

module.exports.Lexer = Lexer;