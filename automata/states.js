class State {
  constructor (obj) {
    this.name = "<Unnamed State>";
    this.accept = false;
    this.delta = {'': []};

    if (obj)
      for (let x in obj) {
        this[x] = obj[x];
      }
  }

  toString() {
    return this.name;
  }

  static merge(StateClass, /** @type{Set} */states) {
    let ns = new StateClass({});
    let newName = new Array();

    for (let state of states) {
      newName.push(state.name);
    }

    if (newName.length !== 0) {
      ns.name = newName.join("\t");
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

module.exports.State = State;