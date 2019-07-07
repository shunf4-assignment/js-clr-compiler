const logger = require("winston");
const { tagSpecialChars } = require("../../common/utils");

class Grammar {
  constructor(obj) {
    this.auxObj = null;
    this.terminals = [];
    this.nonTerminals = [];
    this.startSymbol = null;
    this.productions = [];
    if (!obj)
      return;

    Object.assign(this, obj);
  }

  get symbols() {
    return new Set([...this.nonTerminals, ...this.terminals]);
  }

  fix() {
    function prodToString() {
      return Grammar.prodToString(this);
    }

    // 把非终结符补全
    let g = this;
    g.terminals = new Set(g.terminals);
    let s = new Set(g.nonTerminals);

    for (let i = 0; i < g.productions.length; i++) {
      g.productions[i].index = i;
      g.productions[i].toString = prodToString;
    }

    for (let p of g.productions) {
      for (let pair of p.left) {
        let letter = pair[UniqueName];
        s.add(letter);
      }
    }

    g.nonTerminals = new Set(Array.from(s).filter(v => !g.terminals.has(v)));
    g.terminals.add(EOF); // 添加 EOF

    // 验证
    for (let p of g.productions) {
      for (let pair of p.right) {
        let letter = pair[UniqueName];
        if (!g.terminals.has(letter) && !g.nonTerminals.has(letter)) {
          throw new TranslateError(`翻译器配置错误: 某产生式右侧的 ${letter} 既不是终结符也不是非终结符.`)
        }
      }
    }
  }

  static prodToString(prod) {
    let result = "";
    for (let pair of prod.left) {
      result += pair[UniqueName];
      result += " ";
    }
    result += "→";
    for (let pair of prod.right) {
      result += " ";
      result += tagSpecialChars(pair[UniqueName]);
    }
    if (prod.right.length === 0) {
      result += " ε";
    }
    return result;
  }

  toString() {
    let str = "";
    str += "========= 文法打印 =========" + "\n";
    str += `名称: ${this.name}` + "\n";
    str += "终结符: \n";
    for (let l of this.terminals) {
      l = tagSpecialChars(l);
      str += "\"" + l + "\"";
      str += ", ";
    }
    str = str.substring(0, str.length - 2) + "\n";

    str += "非终结符:\n";
    for (let l of this.nonTerminals) {
      str += l;
      str += ", ";
    }
    str = str.substring(0, str.length - 2) + "\n\n";

    str += "起始符号: " + this.startSymbol + "\n";

    str += "产生式:\n";

    let prodI = 0;
    for (let prod of this.productions) {
      str += prodI + ".\t" + Grammar.prodToString(prod) + "\n";
      prodI++;
    }

    if (this.FIRST) {
      str += "\n已计算的 FIRST 集合:\n";

      for (let l of this.symbols) {
        if (l === EOF)
          continue;

        str += `FIRST(${l}) = { `;
        
        for (let fl of this.FIRST[l]) {
          
          str += tagSpecialChars(fl) + ", ";
          
        }

        if (this.FIRST[l].size)
          str = str.substring(0, str.length - 2);
        str += " }\n";
      }
    }

    return str;
  }

  calcFIRST() {
    this.FIRST = {};
    let FIRST = this.FIRST;
    let sthChanged = true;
    let symbols = this.symbols;
    //symbols.delete(EOF);

    let iter = 0;
    while (sthChanged) {
      sthChanged = false;
      iter++;
      //console.log(`iter: ${iter}`);
      for (let sym of symbols) {
        if (FIRST[sym] === undefined) {
          FIRST[sym] = new Set();
          //console.log('notice', "sthChanged because of new Set");
          sthChanged = true;
        }

        if (iter > 100) {
          //console.log(`${sym} ${FIRST[sym].size}`);
        }
        let currFIRST = FIRST[sym];
        let cFprevLen = currFIRST.size;

        if (this.terminals.has(sym)) {
          currFIRST.add(sym);
        } else {
          for (let prod of this.productions) {
            if (prod.left.length !== 1) {
              throw TranslateError(`${Grammar.prodToString(prod)} 不符合 LR(1) 文法`);
            }

            let leftNonTerm = prod.left[0][UniqueName];

            if (leftNonTerm !== sym) {
              continue;
            }

            if (prod.right.length === 0) {
              // X -> epsilon
              currFIRST.add("");
            } else {
              let firstSym = prod.right[0][UniqueName];
              if (this.terminals.has(firstSym)) {
                // X -> a...
                currFIRST.add(firstSym);
              } else {
                // X -> Y...
                let firstSymFIRST = FIRST[firstSym] === undefined ? new Set() : new Set(FIRST[firstSym]);

                //logger.error([sym, firstSym]);
                
                let haveEpsilon = firstSymFIRST.has("");
                if (haveEpsilon) {
                  firstSymFIRST.delete("");
                }

                FIRST[sym] = new Set([...currFIRST, ...firstSymFIRST]);
                currFIRST = FIRST[sym];

                if (haveEpsilon) {
                  // 将后续符号的 FIRST 加入
                  let i = 1;
                  for (; i < prod.right.length; i++) {
                    let rightSym = prod.right[i][UniqueName];
                    if (this.terminals.has(rightSym)) {
                      currFIRST.add(rightSym);
                      break;
                    }

                    let rightSymFIRST = FIRST[rightSym] === undefined ? new Set() : new Set(FIRST[rightSym]);
                
                    let haveEpsilon = rightSymFIRST.has("");
                    if (haveEpsilon) {
                      rightSymFIRST.delete("");
                    }

                    FIRST[sym] = new Set([...currFIRST, ...rightSymFIRST]);
                    currFIRST = FIRST[sym];

                    if (!haveEpsilon) {
                      break;
                    }
                  }

                  if (i === prod.right.length) {
                    // 没有跳出循环, 一路都遇到 <epsilon>
                    currFIRST.add("");
                  }
                }
              }
            }
          }
        }

        if (currFIRST.size !== cFprevLen) {
          //console.log('notice', `sthChanged because of ${sym} ${FIRST[sym].size} ${currFIRST.size} !== ${cFprevLen}`);
          sthChanged = true;
        }
      }
    }
  }

  FIRSTOf(sth) {
    if (!(sth instanceof Array)) {
      return this.FIRSTOf([sth]);
    }

    if (!this.FIRST) {
      this.calcFIRST();
    }

    let result = new Set();
    let i = 0;
    for (; i < sth.length; i++) {
      let currFIRST = new Set(this.FIRST[sth[i]]);
      let haveEpsilon = currFIRST.has("");
      if (haveEpsilon) {
        currFIRST.delete("");
      }

      result = new Set([...result, ...currFIRST]);
      
      if (!haveEpsilon) {
        break;
      }
    }

    if (i === sth.length) {
      result.add("");
    }

    return result;
  }


}

module.exports.Grammar = Grammar;