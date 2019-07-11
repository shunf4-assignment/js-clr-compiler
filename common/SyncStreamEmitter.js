const { EventEmitter } = require("events");
const { IOEnd } = require("./errors");
const wait = require('wait-for-stuff');
// const sleep = require('sleep');

// Wrap an EventEmitter that may emit multiple types of events to emit only one type of event
// for co-operation with wait-for-stuff
class SyncStreamEmitter extends EventEmitter {
  constructor (wrappedEventEmitter, events) {
    super();
    this.wrapped = wrappedEventEmitter;

    let that = this;

    for (let event of events) {
      this.wrapped.on(event, function(...args) {
        that.emit("somethingHappened", { event: event, args: args });
        //sleep.usleep(0.2 * 1000 * 1000);
      })
    }

    this.ended = false;
  }

  readPartSync() {
    let event;
    let contents;
  
    if (this.ended) {
      throw new IOEnd();
    }
  
    ({event, args: [contents]} = wait.for.event(this, "somethingHappened"));
    this.removeAllListeners();
    if (event === "data") {
      return contents;
    } else if (event === "end") {
      this.ended = true;
      throw new IOEnd();
    } else {
      throw new Error("Unknown event: " + event);
    }
  }
}

module.exports.SyncStreamEmitter = SyncStreamEmitter;