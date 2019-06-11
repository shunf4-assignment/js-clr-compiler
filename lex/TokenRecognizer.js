const { NFA } = require("../automata/NFA");
const { DFA } = require("../automata/DFA");

const { State } = require("../automata/states");

class TokenRecognizer {
  constructor(obj) {
    this.name = obj.name;
    this.evaluator = obj.evaluator;
    this.dfa = new DFA(new NFA(State, obj.nfa));
  }

  toString() {
    return `<${this.name} - ${this.dfa.name}>`;
  }
}

module.exports.TokenRecognizer = TokenRecognizer;