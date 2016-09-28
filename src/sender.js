var User = require('./user');
var Config = require('./_config.json');
var Emitter = require('./lib/emitter')

function sender(session_id) {
  this.session_id = session_id;
  this.to = {
    'client_type': 'ssh',
    'session_id': 'receiver_' + session_id.split('_')[1]
  };
  this.u = new User(session_id);
  this.send_times = Config.send_times;
  this.current_times = 1;
  this.start();
}

sender.prototype.start = function() {
  var self = this;
  self.loop = true;
  self.u.login();
  self.u.client.on('login_success', function() {
    self.start_send();
  });

  self.u.client.on('login_fail', function() {
    self.stop();
  });
};

sender.prototype.stop = function() {
  this.stop_send();
};

sender.prototype.start_send = function() {
  var self = this;

  if (!self.u.client.ws) {
    console.log(self.session_id + ' \'s ws is closed.');
    return;
  }
  
  // 发送文件完事儿后，继续发送文件
  self.u.client.sendFile(Config.send_file, self.to, '', function(result) {
    if (result.err) {
      console.log('send_file fail.' + result.err);
    }

    // 假装断线重连
    if (Config.send_make_reconnect == true && Math.ceil(Math.random() * 100) < 30) {
      console.log(self.session_id + ' disconnect, and will reconnect in 3 seconds after.');
      self.make_reconnect();
      return;
    }

    // 死循环参数判断 or 循环条件 and 循环次数
    if (self.loop == true && (Config.send_endless || self.current_times < self.send_times)) {
      console.log(self.session_id + ' send file to receiver. ' + self.current_times + " times.");
      self.current_times++;
      setTimeout(function() {
        self.start_send();
      }, Math.ceil(Math.random() * Config.send_random_time) * 1000);
    } else {
      console.log('out of loop range');
      return;
    }

  });
};

sender.prototype.stop_send = function() {
  this.loop == false;
  var self = this;
  self.u.client.close();
};

sender.prototype.make_reconnect = function() {
  var self = this;
  self.stop();
  setTimeout(function() {
    self.start();
  }, 3000);
}

module.exports = sender;
// new sender('sender_1');