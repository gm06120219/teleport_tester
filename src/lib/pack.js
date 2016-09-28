var uuid = require('uuid');

function Pack(cmd, msg, id) {
  this.cmd = cmd;
  this.msg = msg;
  this.id = id || uuid();
}

Pack.prototype.toObject = function() {
  return {
    cmd: this.cmd,
    msg: this.msg,
    to: this.msg.to,
    id: this.id
  };
};

Pack.prototype.toJSON = function() {
  return JSON.stringify(this.toObject());
};

Pack.prototype.toString = Pack.prototype.toJSON;

module.exports = Pack;
