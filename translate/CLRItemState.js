const logger = require("winston");
const { State } = require("../automata/states");
const { CLRItem } = require("./CLRItem");

class CLRItemState extends State {
  constructor (obj, clrItemsSet) {
    super(obj);

    this.clrItems = new Set(clrItemsSet);

    if (this.name === "<Unnamed State>") {
      this.genName();
    }
  }

  genName() {
    if (this.clrItems.size !== 0) {
      this.name = "";
      for (let clrItem of this.clrItems) {
        this.name += clrItem.toString() + "\n";
      }
       
      if (this.clrItems.size) {
        this.name = this.name.substring(0, this.name.length - 1);
      }
    } else {
      this.name = "<No LRItems>";
    }
  }

  equalTo(another) {
    if (this.clrItems.size > 1 || another.clrItems.size > 1) {
      throw TranslateError("Not Implemented");
    }
    
    if (this.clrItems.size === 0 && another.clrItems.size === 0) {
      return true;
    }

    if (this.clrItems.size === 1 && another.clrItems.size === 1) {
      let thisSole, anotherSole;
      for (let v of this.clrItems) {
        thisSole = v;
      }
      for (let v of another.clrItems) {
        anotherSole = v;
      }
      
      return (thisSole.equalTo(anotherSole));
    }

    return false;
  }

  static merge(StateClass, CLRItemStates) {
    /** @type {CLRItemState} */
    let ns = super.merge(StateClass, CLRItemStates);
    ns.clrItems = new Set();
    
    for (let state of CLRItemStates) {
      for (let item of state.clrItems) {
        ns.clrItems.add(item);
      }
    }

    ns.genName();
    return ns;
  }
}

module.exports.CLRItemState = CLRItemState;