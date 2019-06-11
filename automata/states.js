class State {
  constructor (obj) {
    this.name = "(Unnamed State)";
    this.accept = false;
    this.delta = {'': []};

    if (obj)
      for (let x in obj) {
        this[x] = obj[x];
      }
  }

  static merge(/** @type{Set} */states) {
    let ns = new State({});
    let newName = new Array();

    for (let state of states) {
      newName.push(state.name);
    }

    if (newName.length !== 0) {
      ns.name = newName.join("|");
    } else {
      ns.name = "_empty";
    }

    return ns;
  }

  static anyAccept(/** @type{Set} */states) {
    let result = false;
    states.forEach((state) => {
      if (state.accept) {
        result = true;
      }
    });

    return result;
  }
}

class LRItemState extends State {
  constructor (obj) {
    super(obj);

    this.lrItems = new Set();
  }

  static merge(...lrItemStates) {
    /** @type {LRItemState} */
    let ns = super.merge(lrItemStates);
    ns.lrItems = new Set();
    
    for (let state of lrItemStates) {
      for (let item of state.lrItems) {
        ns.lrItems.add(item);
      }
    }
  }
}

module.exports.State = State;
module.exports.LRItemState = LRItemState;