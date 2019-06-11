const logger = require("winston");
const { DFAInvalidError }  = require("../common/errors");
const { NFA }  = require("./NFA");
const { tagSpecialChars } = require("../common/utils");

function eqSet(as, bs) {
  return as.size === bs.size && all(isIn(bs), as);
}

function all(pred, as) {
  for (var a of as) if (!pred(a)) return false;
  return true;
}

function isIn(as) {
  return function (a) {
      return as.has(a);
  };
}

class DFA extends NFA {
  constructor(/** @type{NFA} */nfa) {
    let copiedObj = {
      name: nfa.name + " (Determinized)",
      alphabet: nfa.alphabet,
      categories: nfa.categories,
      catMap: nfa.catMap,
      enablesElse: nfa.enablesElse,
      initial: nfa.initial,
      states: {}
    };

    super(nfa.StateClass, copiedObj);

    this.currStateName = "";
    
    logger.debug(`==== 开始将 NFA ${nfa.name} 转为 DFA ${this.name} ====`);
    let initialClosure = new Set([nfa.states[nfa.initial]]);
    initialClosure = nfa.epsilonClosure(initialClosure);

    logger.debug(`初始状态闭包: `);

    let tmpStrList = []
    let tmpStr;
    for (let s of initialClosure) {
      tmpStrList.push(s.name);
    }

    tmpStr = tmpStrList.join(", ")
    logger.debug(tmpStr === "" ? "(空)" : tmpStr);

    let dfaInitial = this.StateClass.merge(initialClosure);
    dfaInitial.accept = this.StateClass.anyAccept(initialClosure);

    this.states[dfaInitial.name] = dfaInitial;
    let stateNames = Object.keys(this.states);
    let stateOrigStates = [initialClosure];

    this.initial = dfaInitial.name;

    logger.debug(`创建了新状态 ${stateNames.length - 1}: ${dfaInitial.name}, ${dfaInitial.accept ? "接受": "非接受"}`);

    for (let i = 0; i < stateNames.length; i++) {
      logger.debug(`现分析状态 ${stateNames[i]}`);

      for (let l of this.alphabet) {
        // 生成目标状态集合
        let destOrigStates = new Set();
        for (let origState of stateOrigStates[i]) {
          if (origState.delta[l]) {
            origState.delta[l].forEach((destName) => {
              destOrigStates.add(nfa.states[destName]);
            });
          }
        }

        logger.debug(`状态 ${stateNames[i]} 经字母 ${tagSpecialChars(l)} 转移到状态:`);

        tmpStrList = [];
        for (let s of destOrigStates) {
          tmpStrList.push(s.name);
        }

        tmpStr = tmpStrList.join(", ")
        logger.debug(tmpStr === "" ? "(空)" : tmpStr);

        ///
        destOrigStates = nfa.epsilonClosure(destOrigStates);
        ///

        logger.debug(`状态 ${stateNames[i]} 经字母 ${tagSpecialChars(l)} 转移到状态 (epsilon-闭包后):`);

        tmpStrList = [];
        for (let s of destOrigStates) {
          tmpStrList.push(s.name);
        }
        tmpStr = tmpStrList.join(", ")
        logger.debug(tmpStr === "" ? "(空)" : tmpStr);

        ///
        let duplicate = false;
        let duplicatedStateName;
        for (let sosI in stateOrigStates) {
          let sos = stateOrigStates[sosI];
          if (eqSet(sos, destOrigStates)) {
            duplicate = true;
            duplicatedStateName = stateNames[sosI];
            logger.debug(`与状态 ${stateNames[sosI]} 重复`);
            break;
          }
        }

        if (!duplicate) {
          let newState = this.StateClass.merge(destOrigStates);
          newState.accept = this.StateClass.anyAccept(destOrigStates);
          this.states[newState.name] = newState;
          stateNames.push(newState.name);
          stateOrigStates.push(destOrigStates);

          logger.debug(`创建了新状态 ${stateNames.length - 1}: ${newState.name}, ${newState.accept ? "接受": "非接受"}`);

          this.states[stateNames[i]].delta[l] = [newState.name];
        } else {
          this.states[stateNames[i]].delta[l] = [duplicatedStateName];
        }
      }

      this.states["_extraEmpty"] = new this.StateClass({
        name: "_extraEmpty",
        accept: false,
        delta: {
          '': []
        }
      });
    }

    this.currStateName = this.initial;
  }

  validate() {
    for (let sName in this.states) {
      if (sName == "_extraEmpty")
        break;

      let s = this.states[sName];
      
      for (let l of this.alphabet) {
        if (!s.delta[l]) {
          throw new DFAInvalidError(`状态 ${sName} 在读 ${l} 时不转移`);
        }
      }

      for (let l in s.delta) {
        if (s.delta[l].length != 1) {
          throw new DFAInvalidError(`状态 ${sName} 在读 ${l} 时转移状态数不为 1`);
        }
      }
    }

    if (!(this.states[this.initial])) {
      throw new DFAInvalidError(`没有这个初始状态: ${this.initial}`);
    }

    if (!(this.states[this.currStateName])) {
      throw new DFAInvalidError(`没有这个当前状态: ${this.currStateName}`);
    }
  }

  goOneStep(/** @type {String} */letter) {
    if (!this.currStateName || !this.states[this.currStateName]) {
      throw new DFAInvalidError(`currStateName 错误: ${this.currStateName}`);
    }

    let currState = this.states[this.currStateName];

    if (this.catMap[letter] !== undefined) {
      letter = this.catMap[letter];
    }

    if (currState.delta[letter] === undefined || currState.delta[letter].length === 0) {
      if (this.enablesElse) {
        letter = "[else]";
      } else {
        this.currStateName = "_extraEmpty";
        return;
      }
    }

    this.currStateName = currState.delta[letter][0];
  }

  reset() {
    this.currStateName = this.initial;
  }

  get currAccept() {
    return this.states[this.currStateName].accept;
  }

  get currState() {
    return this.states[this.currStateName];
  }

}

module.exports.DFA = DFA;