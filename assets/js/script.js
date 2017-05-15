/* global EventLoopAnimation */

/**
 * script 1
 */

function log1(str) {
  console.log(str);
  var logEl = document.querySelector('.log-output-1');
  logEl.value += (logEl.value ? '\n' : '') + str;
}

document.querySelector('.clear-log-1').addEventListener('click', function () {
  document.querySelector('.log-output-1').value = '';
});

document.querySelector('.test-1').addEventListener('click', function () {
  log1('script start');

  setTimeout(function () {
    log1('setTimeout');
  }, 0);

  Promise.resolve().then(function () {
    log1('promise1');
  }).then(function () {
    log1('promise2');
  });

  log1('script end');
});

/**
 * script 2
 */

(function () {
  function transition(el, obj, duration, easing) {
    return new Promise(function (resolve, reject) {
      if (obj.transform) {
        obj['-webkit-transform'] = obj.transform;
      }

      var objKeys = Object.keys(obj);

      if (duration) {
        el.style.transitionProperty = objKeys.join();
        el.style.transitionTimingFunction = easing;
        el.style.transitionDuration = duration + 's';
        el.offsetLeft; // style recalc

        el.addEventListener('transitionend', function te() {
          el.style.transitionProperty = '';
          el.style.transitionTimingFunction = '';
          el.style.transitionDuration = '';
          resolve();
          el.removeEventListener('transitionend', te);
        });
      } else {
        resolve();
      }

      objKeys.forEach(function (key) {
        el.style.setProperty(key, obj[key]);
      });
    });
  }

  function EventLoopAnimation(el) {
    this._initalState = el;
    this._states = [];
    this._el = el;
    this._queue = Promise.resolve();
    this._reset();
  }

  EventLoopAnimation.prototype._reset = function () {
    var newEl = this._initalState.cloneNode(true);
    this._tasksShown = 0;
    this._microtasksShown = 0;
    this._tasksRemoved = 0;
    this._microtasksRemoved = 0;
    this._logsShown = 0;
    this._currentPos = 0;

    this._el.parentNode.insertBefore(newEl, this._el);
    this._el.parentNode.removeChild(this._el);
    this._el = newEl;
    this._taskRail = this._el.querySelector('.task-queue .event-loop-rail');
    this._microtaskRail = this._el.querySelector('.microtask-queue .event-loop-rail');
    this._jsStack = this._el.querySelector('.js-stack .event-loop-items');
    this._log = this._el.querySelector('.event-loop-log .event-loop-items');
    this._codeBar = this._el.querySelector('.line-highlight');
    this._codePane = this._el.querySelector('.codehilite');
    this._commentary = this._el.querySelector('.event-loop-commentary-item');

    var onClick = function (event) {
      var className = event.target.getAttribute('class');
      if (className === 'prev-btn') {
        event.preventDefault();
        if (event.type == 'click') {
          this.back();
        }
      } else if (className === 'next-btn') {
        event.preventDefault();
        if (event.type == 'click') {
          this.forward(true);
        }
      }
    }.bind(this);

    this._el.addEventListener('click', onClick);
    this._el.addEventListener('mousedown', onClick);
  };

  EventLoopAnimation.prototype.forward = function (animate) {
    this._queue = this._queue.then(function () {
      var state = this._states[this._currentPos];
      if (!state) return this.goTo(0);
      this._currentPos++;
      return Promise.all(
        state.map(function (func) {
          return func(animate);
        })
      );
    }.bind(this));
  };

  EventLoopAnimation.prototype.goTo = function (pos) {
    this._queue = this._queue.then(function () {
      this._reset();
      while (pos--) {
        this.forward(false);
      }
    }.bind(this));
  };

  EventLoopAnimation.prototype.back = function () {
    this._queue = this._queue.then(function () {
      if (this._currentPos === 0) return this.goTo(this._states.length);
      return this.goTo(this._currentPos - 1);
    }.bind(this));
  };

  EventLoopAnimation.prototype.state = function () {
    this._states.push([]);
    return this;
  };

  EventLoopAnimation.prototype.action = function (func) {
    this._states[this._states.length - 1].push(func);
    return this;
  };

  EventLoopAnimation.prototype.pushTask = function (activated) {
    return this.action(function (animate) {
      var newTask = this._taskRail.children[this._tasksShown];
      this._tasksShown++;

      if (activated) {
        newTask.style.backgroundColor = '#FFDF1E';
      }

      return transition(newTask, {
        opacity: 1
      }, 0.2 * animate, 'ease-in-out');
    }.bind(this));
  };

  EventLoopAnimation.prototype.pushMicrotask = function () {
    return this.action(function (animate) {
      var newTask = this._microtaskRail.children[this._microtasksShown];
      this._microtasksShown++;

      return transition(newTask, {
        opacity: 1
      }, 0.2 * animate, 'ease-in-out');
    }.bind(this));
  };

  EventLoopAnimation.prototype.pushStack = function (text) {
    return this.action(function (animate) {
      var div = document.createElement('div');
      div.className = 'event-loop-item';
      div.textContent = text;
      div.style.backgroundColor = '#FFDF1E';
      this._jsStack.appendChild(div);
      return transition(div, {
        opacity: 1
      }, 0.2 * animate, 'ease-in-out');
    }.bind(this));
  };

  EventLoopAnimation.prototype.popStack = function (text) {
    return this.action(function (animate) {
      var div = this._jsStack.children[this._jsStack.children.length - 1];
      return transition(div, {
        opacity: 0
      }, 0.2 * animate, 'ease-in-out').then(function () {
        this._jsStack.removeChild(div);
      }.bind(this));
    }.bind(this));
  };

  EventLoopAnimation.prototype.showCodeBar = function () {
    return this.action(function (animate) {
      return transition(this._codeBar, {
        opacity: 1
      }, 0.2 * animate, 'ease-in-out');
    }.bind(this));
  };

  EventLoopAnimation.prototype.hideCodeBar = function () {
    return this.action(function (animate) {
      return transition(this._codeBar, {
        opacity: 0
      }, 0.2 * animate, 'ease-in-out');
    }.bind(this));
  };

  EventLoopAnimation.prototype.pushLog = function () {
    return this.action(function (animate) {
      var newLog = this._log.children[this._logsShown];
      this._logsShown++;

      return transition(newLog, {
        opacity: 1
      }, 0.2 * animate, 'ease-in-out');
    }.bind(this));
  };

  EventLoopAnimation.prototype.moveToLine = function (num) {
    return this.action(function (animate) {
      var barHeight = this._codeBar.getBoundingClientRect().height;

      return transition(this._codePane, {
        transform: 'translateY(' + ((num - 1) * -barHeight) + 'px)'
      }, 0.3 * animate, 'ease-in-out');
    }.bind(this));
  };

  EventLoopAnimation.prototype.commentary = function (text) {
    return this.action(function (animate) {
      this._commentary.textContent = text;
      return transition(this._commentary, {
        opacity: 1
      }, 0.2 * animate, 'ease-in-out');
    }.bind(this));
  };

  EventLoopAnimation.prototype.hideCommentary = function () {
    return this.action(function (animate) {
      return transition(this._commentary, {
        opacity: 0
      }, 0.2 * animate, 'ease-in-out');
    }.bind(this));
  };

  EventLoopAnimation.prototype.activateMicrotask = function () {
    return this.action(function (animate) {
      var div = this._microtaskRail.children[this._microtasksRemoved];
      return transition(div, {
        'background-color': '#FFDF1E'
      }, 0.2 * animate, 'ease-in-out');
    }.bind(this));
  };

  EventLoopAnimation.prototype.shiftMicrotask = function () {
    return this.action(function (animate) {
      this._microtasksRemoved++;
      var offset;
      var offsetEl = this._microtaskRail.children[this._microtasksRemoved];

      if (offsetEl) {
        offset = offsetEl.offsetLeft;
      } else {
        offset = this._microtaskRail.offsetWidth;
      }

      return transition(this._microtaskRail, {
        'transform': 'translateX(' + (-offset) + 'px)'
      }, 0.3 * animate, 'ease-in-out');
    }.bind(this));
  };

  EventLoopAnimation.prototype.activateTask = function () {
    return this.action(function (animate) {
      var div = this._taskRail.children[this._tasksRemoved];
      return transition(div, {
        'background-color': '#FFDF1E'
      }, 0.2 * animate, 'ease-in-out');
    }.bind(this));
  };

  EventLoopAnimation.prototype.shiftTask = function () {
    return this.action(function (animate) {
      this._tasksRemoved++;
      var offset;
      var offsetEl = this._taskRail.children[this._tasksRemoved];

      if (offsetEl) {
        offset = offsetEl.offsetLeft;
      } else {
        offset = this._taskRail.offsetWidth;
      }

      return transition(this._taskRail, {
        'transform': 'translateX(' + (-offset) + 'px)'
      }, 0.3 * animate, 'ease-in-out');
    }.bind(this));
  };

  window.EventLoopAnimation = EventLoopAnimation;
}());

new EventLoopAnimation(document.querySelector('.event-loop-walkthrough-1'))
  .state().moveToLine(1).pushTask(true).pushStack('script').showCodeBar()
  .state().pushLog()
  .state().moveToLine(3)
  .state().commentary('setTimeout callbacks are queued as tasks')
  .state().hideCommentary().pushTask()
  .state().moveToLine(7)
  .state().commentary('Promise callbacks are queued as microtasks')
  .state().hideCommentary().pushMicrotask()
  .state().moveToLine(13)
  .state().pushLog()
  .state().hideCodeBar().popStack()
  .state().commentary('At the end of a task, we process microtasks')
  .state().hideCommentary().activateMicrotask()
  .state().showCodeBar().moveToLine(8).pushStack('Promise callback')
  .state().pushLog()
  .state().hideCodeBar().commentary("This promise callback returns 'undefined', which queues the next promise callback as a microtask")
  .state().hideCommentary().pushMicrotask()
  .state().popStack().commentary('This microtask is done so we move onto the next one in the queue')
  .state().hideCommentary()
  .state().shiftMicrotask().activateMicrotask()
  .state().showCodeBar().moveToLine(10).pushStack('Promise callback')
  .state().pushLog()
  .state().hideCodeBar().popStack().shiftMicrotask()
  .state().commentary("And that's this task done! The browser may update rendering")
  .state().hideCommentary()
  .state().shiftTask().activateTask()
  .state().showCodeBar().moveToLine(4).pushStack('setTimeout callback')
  .state().pushLog()
  .state().hideCodeBar().popStack()
  .state().shiftTask()
  .state().commentary('fin');

/**
 * script 3
 */

var targetLogOutput;

function log2(str) {
  console.log(str);
  var el;

  if (jsActivatedClick) {
    el = document.querySelector('.log-output-3');
  } else {
    el = document.querySelector('.log-output-2');
  }
  el.value += (el.value ? '\n' : '') + str;
}

document.querySelector('.clear-log-2').addEventListener('click', function () {
  document.querySelector('.log-output-2').value = '';
});

// Let's get hold of those elements
var outer = document.querySelector('.outer-test');
var inner = document.querySelector('.inner-test');

// Let's listen for attribute changes on the
// outer element
new MutationObserver(function () {
  log2('mutate');
}).observe(outer, {
  attributes: true
});

// Here's a click listener…
function onClick() {
  log2('click');

  setTimeout(function () {
    log2('timeout');
  }, 0);

  Promise.resolve().then(function () {
    log2('promise');
  });

  outer.setAttribute('data-random', Math.random());
}

// …which we'll attach to both elements
inner.addEventListener('click', onClick);
outer.addEventListener('click', onClick);

/**
 * script 4
 */

new EventLoopAnimation(document.querySelector('.event-loop-walkthrough-2'))
  .state().pushTask(true)
  .state().moveToLine(15).pushStack('onClick').showCodeBar()
  .state().pushLog()
  .state().moveToLine(17)
  .state().pushTask()
  .state().moveToLine(21)
  .state().pushMicrotask()
  .state().moveToLine(25)
  .state().commentary('This mutation queues a microtask to handle observers')
  .state().hideCommentary().pushMicrotask()
  .state().hideCodeBar().popStack()
  .state().commentary("Although we're mid-task, microtasks are processed after callbacks if the stack is empty")
  .state().hideCommentary().activateMicrotask()
  .state().showCodeBar().moveToLine(22).pushStack('Promise callback')
  .state().pushLog()
  .state().hideCodeBar().popStack().shiftMicrotask().activateMicrotask()
  .state().showCodeBar().moveToLine(8).pushStack('Mutation callback')
  .state().pushLog()
  .state().hideCodeBar().popStack().shiftMicrotask()
  .state().commentary('The event bubbles, so our callback is called again for the outer element')
  .state().hideCommentary().moveToLine(15).pushStack('onClick').showCodeBar()
  .state().pushLog()
  .state().moveToLine(17)
  .state().pushTask()
  .state().moveToLine(21)
  .state().pushMicrotask()
  .state().moveToLine(25)
  .state().pushMicrotask()
  .state().hideCodeBar().popStack()
  .state().activateMicrotask()
  .state().showCodeBar().moveToLine(22).pushStack('Promise callback')
  .state().pushLog()
  .state().hideCodeBar().popStack().shiftMicrotask().activateMicrotask()
  .state().showCodeBar().moveToLine(8).pushStack('Mutation callback')
  .state().pushLog()
  .state().hideCodeBar().popStack().shiftMicrotask()
  .state().shiftTask().activateTask()
  .state().showCodeBar().moveToLine(18).pushStack('setTimeout callback')
  .state().pushLog()
  .state().popStack().hideCodeBar().shiftTask().activateTask()
  .state().showCodeBar().pushStack('setTimeout callback')
  .state().pushLog()
  .state().popStack().hideCodeBar().shiftTask()
  .state().commentary('fin');

/**
 * script 5
 */

var jsActivatedClick = false;
document.querySelector('.test-2').addEventListener('click', function () {
  jsActivatedClick = true;
  inner.click();
  setTimeout(function () {
    jsActivatedClick = false;
  }, 100);
});
document.querySelector('.clear-log-3').addEventListener('click', function () {
  document.querySelector('.log-output-3').value = '';
});

/**
 * script 6
 */

new EventLoopAnimation(document.querySelector('.event-loop-walkthrough-3'))
  .state().pushTask(true).pushStack('script')
  .state().moveToLine(32).showCodeBar()
  .state().moveToLine(15).pushStack('onClick')
  .state().pushLog()
  .state().moveToLine(17)
  .state().pushTask()
  .state().moveToLine(21)
  .state().pushMicrotask()
  .state().moveToLine(25)
  .state().pushMicrotask()
  .state().hideCodeBar().popStack()
  .state().commentary('We cannot process microtasks, the stack is not empty')
  .state().hideCommentary()
  .state().moveToLine(15).showCodeBar().pushStack('onClick')
  .state().pushLog()
  .state().moveToLine(17)
  .state().pushTask()
  .state().moveToLine(21)
  .state().pushMicrotask()
  .state().moveToLine(25)
  .state().commentary("We don't add another mutation microtask as one is already pending")
  .state().hideCommentary().hideCodeBar().popStack()
  .state().moveToLine(32).showCodeBar()
  .state().hideCodeBar().popStack()
  .state().commentary("We're at the end of this task, so now we can process microtasks")
  .state().hideCommentary().activateMicrotask()
  .state().showCodeBar().moveToLine(22).pushStack('Promise callback')
  .state().pushLog()
  .state().hideCodeBar().popStack().shiftMicrotask().activateMicrotask()
  .state().showCodeBar().moveToLine(8).pushStack('Mutation callback')
  .state().pushLog()
  .state().hideCodeBar().popStack().shiftMicrotask().activateMicrotask()
  .state().showCodeBar().moveToLine(22).pushStack('Promise callback')
  .state().pushLog()
  .state().hideCodeBar().popStack().shiftMicrotask()
  .state().shiftTask().activateTask()
  .state().showCodeBar().moveToLine(18).pushStack('setTimeout callback')
  .state().pushLog()
  .state().popStack().hideCodeBar().shiftTask().activateTask()
  .state().showCodeBar().pushStack('setTimeout callback')
  .state().pushLog()
  .state().popStack().hideCodeBar().shiftTask()
  .state().commentary('fin');
