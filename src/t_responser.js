var User = require('./user');
var Config = require('./_config.json');

function t_responser(session_id) {
  this.session_id = session_id;
  var self = this;

  var u = new User(session_id);
  u.login();

  // process login success
  u.client.on('login_success', function() {
    console.log(self.session_id + ' login success!');
  });

  // process login fail
  u.client.on('login_fail', function() {
    console.log(self.session_id + ' login fail!');
  });

  // process request
  u.client.on('request', function(msg, res) {
    console.log(self.session_id + ' get a request. from ' + msg.from.session_id);
    // console.log(self.session_id + ' request message:' + JSON.stringify(msg));

    var ret_msg = {
      'body': 'response message by liguangming\'s t_responser.',
      'from': {
        'client_type': 'ssh',
        'session_id': self.session_id
      }
    };
    res.send(ret_msg);
  });

  // process file
  u.client.on('file', function(fileReceiver, done) {
    // skip 
  });

  // process file error
  u.client.on('file_error', function(fileReceiver, err) {
    // skip
  });
}

module.exports = t_responser;

// var r = new t_responser('t_responser_' + 1);