var User = require('./user');
var Config = require('./_config.json');

function t_requester(session_id) {
  this.session_id = session_id;
  this.u = new User(session_id);
  this.to = {
    'client_type': 'ssh',
    'session_id': 't_responser_' + session_id.split('_')[2]
  };
  this.current_times = 1;
  this.request_send_times = Config.request_send_times;
  this.loop = true;
  this.start();
}

t_requester.prototype.start = function() {
  var self = this;
  self.loop = true;
  self.u.login();

  // process login success
  self.u.client.on('login_success', function() {
    console.log(self.session_id + ' login success!');
    self.start_request();
  });

  // process login fail
  self.u.client.on('login_fail', function() {
    console.log(self.session_id + ' login fail!');
    self.stop();
  });
}

t_requester.prototype.stop = function() {
  this.stop_request();
}

t_requester.prototype.start_request = function() {
  var self = this;
  // 发送一个请求后，等待响应
  self.send_request();

  // 收到响应后，根据条件继续发送请求
  self.u.client.on('response', function(msg, id) {
    // 如果response是从客户端传回来的话
    if (msg.from && msg.from.session_id === self.to.session_id) {
      // 假装断线重连
      if (Config.send_make_reconnect == true && Math.ceil(Math.random()*100) < 30) {
        console.log(self.session_id + ' disconnect, and will reconnect in 3 seconds after.');
        self.make_reconnect();
        return;
      }

      // 死循环参数判断 or 循环条件 and 循环次数
      // if (Config.request_endless ||  self.loop == true && self.current_times < self.request_send_times) {
      if (self.loop == true && (Config.send_endless || self.current_times < self.send_times)) {
        setTimeout(function() {
          if (!self.u.client.ws) {
            console.log(self.session_id + ' \'s ws is closed.');
            return;
          }
          self.send_request();

          console.log(self.session_id + ' send response ' + self.current_times + ' times.');
          self.current_times ++;
        },  Math.ceil(Math.random() * Config.request_random_time) * 1000); // liguangming midify for add random sleep time
      } else {
        console.log('out of loop range');
        return;
      }
    } else {
      console.log(self.session_id + ' get a idc response. Skip this.');
    }
  });
}

t_requester.prototype.send_request = function() {
  var self = this;
  var request_msg = {
    'to': this.to,
    'msg': 'requeste message by liguangming\'s t_requester.'
  }

  if (!self.u.client.ws) {
    console.log(self.session_id + ' \'s ws is closed.');
    return;
  }
  self.u.client.request(request_msg);
}

t_requester.prototype.stop_request = function() {
  this.loop == false;
  var self = this;
  self.u.client.close();
}

t_requester.prototype.make_reconnect = function() {
  var self = this;
  self.stop();
  setTimeout(function() {
    self.start();
  }, 3000);
}

module.exports = t_requester;

// var r = new t_requester('t_requester_1')