var T_Responser = require('./t_responser');
var Config = require('./_config.json');

function start_test(){
  console.log('Start time: ' + new Date());
  this.request_user_number = Config.request_user_number;
  var self = this;
  for (var i = self.request_user_number - 1; i >= 0; i--) {
    new T_Responser('t_responser_' + i);
  }
}

start_test();