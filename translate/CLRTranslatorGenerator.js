const logger = require("winston");
const { Lexer } = require("../lex/Lexer");
const { Grammar } = require("./grammar/Grammar");
const { CLRItem } = require("./CLRItem");
const { CLRItemState } = require("./CLRItemState");
const { CLRTable } = require("./CLRTable");
const { NFA } = require("../automata/NFA");
const { DFA } = require("../automata/DFA");
const { CLRTranslator } = require("./CLRTranslator");
const fs = require('fs');

class CLRTranslatorGenerator {
  constructor(config) {
    if (!config)
      return;

    this.config = config;
  }

  set config(_config) {
    this.grammar = new Grammar(_config);
    this.grammar.fix();
    
    logger.info(["翻译器生成器: 加载了配置."]);
  }

  get config() {
    return this.grammar;
  }

  insertLRItemAndState(clrItems, statesList, sourceState, symbol, newItem, willAccept) {
    let equalCLRItems = clrItems.filter(v => v.equalTo(newItem));
    if (equalCLRItems.length === 0) {
      clrItems.push(newItem);
    } else {
      newItem = equalCLRItems[0];
    }
    
    let newState = new CLRItemState({
      accept: willAccept,
    }, new Set([newItem]));
    let equalStates = statesList.filter(v => v.equalTo(newState));
    if (equalStates.length === 0) {
      statesList.push(newState);
    } else {
      newState = equalStates[0];
    }

    if (!sourceState.delta[symbol]) {
      sourceState.delta[symbol] = [];
    }
    sourceState.delta[symbol].push(newState.name);
  }

  makeCLRItemStates(clrItems) {
    let statesList = [];
    let initialEmptyState = new CLRItemState({
      name: "<初始空>",
      accept: false
    });
    statesList.push(initialEmptyState);

    // 所有开始符号对应的产生式
    for (let prod of this.grammar.productions) {
      if (prod.left.length !== 1)
        throw new TranslateError("非 LR(1) 文法");
      
      
      if (prod.left[0][UniqueName] === this.grammar.startSymbol) {
        let item = new CLRItem(prod, 0, EOF);
        let itemState = new CLRItemState({
          accept: false
        }, new Set([item]));

        clrItems.push(item);
        statesList.push(itemState);
        initialEmptyState.delta[""].push(itemState.name);
      }
    }

    let i = 1;
    // 增加项目状态, 直到 statesList 不再增长

    for (; i < statesList.length; i++) {
      let currState = statesList[i];
      let currItem = currState.clrItems.values().next().value;  // statesList[i][0]
      let currProd = currItem.production;

      if (currItem.dotPosition === currProd.right.length) {
        // X -> ABCD.
        continue;
      }

      let currSymbol = currProd.right[currItem.dotPosition][UniqueName];

      // X-> AB.CD

      // 加入 Item X -> ABC.D (移进项) 并设置 delta

      let shiftedItem = new CLRItem(currItem.production, currItem.dotPosition + 1, currItem.lookAhead);

      let willAccept = shiftedItem.dotPosition === shiftedItem.production.right.length && shiftedItem.lookAhead === EOF;

      this.insertLRItemAndState(clrItems, statesList, currState, currSymbol, shiftedItem, willAccept);

      if (this.grammar.terminals.has(currSymbol)) {
        // X -> AB.cD  =>  X -> ABc.D 刚刚已经做完, 无需添加更多项目
        continue;
      } else {
        // X -> ab.CdeF (g) => C -> ....
        let remainingSymbols = currItem.production.right.slice(currItem.dotPosition + 1).map(v => v[0]).concat([currItem.lookAhead]);

        let FIRSTOfRemaining = this.grammar.FIRSTOf(remainingSymbols);

        for (let prod of this.grammar.productions) {
          if (prod.left.length !== 1) {
            throw new TranslateError("非 LR(1) 文法");
          }
          
          if (prod.left[0][UniqueName] === currSymbol) {
            // C -> .XYZ (element of FIRST[deFg])
            for (let first of FIRSTOfRemaining) {
              this.insertLRItemAndState(clrItems, statesList, currState, "", new CLRItem(prod, 0, first), false);
            }
          }
        }
      }
    }

    return statesList;
  }

  makeDFA(statesList) {
    let symbols = this.grammar.symbols;
    symbols.delete(EOF);
    let alphabet = [...symbols];

    let states = {};
    for (let s of statesList) {
      states[s.name] = s;
    }
    
    let nfa = new NFA(CLRItemState, {
      name: "CLR NFA",
      alphabet: alphabet,
      categories: {},
      enablesElse: false,
      initial: "<初始空>",
      states: states
    });

    let dfa = new DFA(nfa);
    dfa.validate();
    
    let stateI = 0;
    for (let stateName of Object.keys(dfa.states)) {
      dfa.states[stateName].index = stateI;
      stateI++;
    }
    logger.log('info', dfa.toString());
    return dfa;
  }

  generate() {
    let grammarFileName = "grammar.txt";
    let utf8BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
    fs.writeFile(grammarFileName, Buffer.concat([utf8BOM, Buffer.from(this.grammar.toString(), "utf8")]), function(err) {
      if (err) {
          logger.error(err);
      }
      logger.notice("文法产生式列表已经写入 " + grammarFileName + ".");
    });

    let clrItems = [];
    let statesList = this.makeCLRItemStates(clrItems);
   
    let dfa = this.makeDFA(statesList);

    let table = CLRTable.fromGrammarAndDFA(this.grammar, dfa);
    let utf16leBOM = Buffer.from([0xFF, 0xFE]);
    let clrFileName = "CLRTable.csv";
    fs.writeFile(clrFileName, Buffer.concat([utf16leBOM, Buffer.from(table.toString(), "utf16le")]), function(err) {
      if (err) {
          logger.error(err);
      }
      logger.notice("LR 分析表已经写入 " + clrFileName + ", 请用 Microsoft Office Excel 打开.");
    });

    let result = new CLRTranslator(this.grammar, table, null);
    return result;
  }

}

module.exports.CLRTranslatorGenerator = CLRTranslatorGenerator;