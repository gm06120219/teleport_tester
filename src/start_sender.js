var Sender = require('./sender');
var Receiver = require('./receiver');
var Config = require('./_config.json');

function start_test(){
  console.log('Start time: ' + new Date());
  this.send_user_number = Config.send_user_number;
  var self = this;
  for (var i = self.send_user_number - 1; i >= 0; i--) {
    new Sender('sender_' + i);
  }
}

start_test();