var walkJson = require('./walk_json').walkJson;
var STOP_WALKING = true;

function Emitter() {
  this._listeners = [];
  // 1: error
  // 2: warn
  // 3: debug
  this.log_level = 1;
}

Emitter.prototype._matchMsgType = function(pattern, msg) {
  var hit = true;
  walkJson(pattern, function(key, value, paths) {
    var obj = msg;
    while (paths.length !== 0) {
      var p = paths.shift();
      if (!obj[p]) {
        hit = false;
        return STOP_WALKING;
      } else {
        obj = obj[p];
      }
    }
    if (!obj[key]) {
      hit = false;
      return STOP_WALKING;
    }
    if (value instanceof RegExp) {
      if (!value.test(obj[key])) {
        hit = false;
        return STOP_WALKING;
      }
    } else if (typeof value === 'string' || typeof value === 'number') {
      if (value !== obj[key]) {
        hit = false;
        return STOP_WALKING;
      }
    }
  });
  return hit;
};

Emitter.prototype.emit = function() {
  var args = Array.prototype.slice.call(arguments);
  args.shift();
  if (this._listeners.length === 0) {
    return;
  }
  for (var i = 0; i < this._listeners.length; i++) {
    var pack = this._listeners[i];
    if ('string' === typeof pack.pattern) {
      if (pack.pattern === arguments[0]) {
        //without the first argument
        pack.listener.apply(this, args);
      }
    } else if ('object' === typeof pack.pattern) {
      if (this._matchMsgType(pack.pattern, arguments[0])) {
        //with the first argument
        pack.listener.apply(this, arguments);
      }
    }
  }
};

Emitter.prototype.on = function(p, l) {
  this._listeners.push({
    pattern: p,
    listener: l
  });
};

Emitter.prototype.off = function(l) {
  var index;
  for (var i = 0, len = this._listeners.length; i < len; i++) {
    if (this._listeners[i].listener === l) {
      index = i;
      break;
    }
  }
  if (index != null) {
    this._listeners.splice(index, 1);
  }
};

Emitter.prototype.un = Emitter.prototype.off;

Emitter.prototype.removeAllListeners = function() {
  for (var i = 0, len = this._listeners.length; i < len; i++) {
    this._listeners[i] = null;
  }
  this._listeners = [];
};

Emitter.prototype.delegate = function(func) {
  var self = this;
  return function() {
    return self[func].apply(self, arguments);
  }
};

Emitter.prototype.logError = function(msg) {
  this._log('[error] ' + msg, 1);
};

Emitter.prototype.logWarn = function(msg) {
  this._log('[warn ] ' + msg, 2);
};

Emitter.prototype.logDebug = function(msg) {
  this._log('[debug] ' + msg, 3);
};

Emitter.prototype._log = function(msg, level) {
  if (level <= this.log_level) {
    console.log('[' + new Date().toLocaleTimeString() + '] ' + msg);
  }
};

module.exports = Emitter;